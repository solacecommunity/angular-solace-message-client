import * as solace from 'solclientjs/lib-browser/solclient-full';
import { Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
import { ConnectableObservable, EMPTY, merge, MonoTypeOperatorFunction, noop, Observable, Observer, of, OperatorFunction, Subject, TeardownLogic, throwError } from 'rxjs';
import { distinctUntilChanged, filter, finalize, map, mergeMap, publishReplay, take, takeUntil, tap } from 'rxjs/operators';
import { UUID } from '@scion/toolkit/uuid';
import { Data, MessageEnvelope, ObserveOptions, PublishOptions, SolaceMessageClient } from './solace-message-client';
import { TopicMatcher } from './topic-matcher';
import { observeInside } from '@scion/toolkit/operators';
import { SolaceSessionProvider } from './solace-session-provider';
import { SolaceMessageClientConfig } from './solace-message-client.config';
import { Destination, Message, MessageDeliveryModeType, SDTField, SDTFieldType, Session, SessionEvent, SessionEventCode, SessionProperties } from './solace.model';
import { TopicSubscriptionCounter } from './topic-subscription-counter';
import { SerialExecutor } from './serial-executor.service';
import { SolaceObjectFactory } from './solace-object-factory';

@Injectable()
export class ɵSolaceMessageClient implements SolaceMessageClient, OnDestroy { // tslint:disable-line:class-name

  private _message$ = new Subject<Message>();
  private _event$ = new Subject<SessionEvent>();

  private _session: Promise<Session>;
  private _destroy$ = new Subject<void>();
  private _sessionDisposed$ = new Subject<void>();
  private _whenDestroy = this._destroy$.pipe(take(1)).toPromise();

  private _subscriptionExecutor: SerialExecutor;
  private _subscriptionCounter: TopicSubscriptionCounter;

  public connected$: ConnectableObservable<boolean> = this._event$
    .pipe(
      assertNotInAngularZone(),
      map(event => event.sessionEventCode),
      filter(event => CONNECTION_ESTABLISHED_EVENTS.has(event) || CONNECTION_LOST_EVENTS.has(event)),
      map(event => CONNECTION_ESTABLISHED_EVENTS.has(event)),
      distinctUntilChanged(),
      observeInside(continueFn => this._zone.run(continueFn)),
      publishReplay(1),
    ) as ConnectableObservable<boolean>;

  constructor(@Optional() config: SolaceMessageClientConfig,
              private _sessionProvider: SolaceSessionProvider,
              private _topicMatcher: TopicMatcher,
              private _zone: NgZone) {
    this.initSolaceClientFactory();
    this.disposeWhenSolaceSessionDied();
    this.logSolaceSessionEvents();

    const multicaster = this.connected$.connect();
    this._whenDestroy.then(() => multicaster.unsubscribe());

    // Auto connect to the Solace broker if having provided a module config.
    if (config) {
      this.connect(config).catch(error => console.error('[SolaceMessageClient] Failed to connect to the Solace message broker.', error));
    }
  }

  public async connect(config: SolaceMessageClientConfig): Promise<void> {
    if (!config) {
      throw Error('[SolaceMessageClient] Missing required config for connecting to the Solace message broker.');
    }

    await (this._session || (this._session = new Promise((resolve, reject) => {
      // Apply session defaults.
      const sessionProperties: SessionProperties = {
        reapplySubscriptions: true, // remember subscriptions after a network interruption (default value if not set)
        reconnectRetries: -1, // Try to restore the connection automatically after a network interruption (default value if not set)
        ...config,
      };

      this._zone.runOutsideAngular(() => {
        try {
          console.log('[SolaceMessageClient] Connecting to Solace message broker: ', {...sessionProperties, password: '***'});
          this._subscriptionExecutor = new SerialExecutor();
          this._subscriptionCounter = new TopicSubscriptionCounter();

          const session: Session = this._sessionProvider.provide(SolaceObjectFactory.createSessionProperties(sessionProperties));

          // When the Session is ready to send/receive messages and perform control operations.
          session.on(SessionEventCode.UP_NOTICE, (event: SessionEvent) => {
            this._event$.next(event);
            resolve(session);
          });

          // When the session has gone down, and an automatic reconnection attempt is in progress.
          session.on(SessionEventCode.RECONNECTED_NOTICE, (event: SessionEvent) => this._event$.next(event));

          // Emits when the session was established and then went down.
          session.on(SessionEventCode.DOWN_ERROR, (event: SessionEvent) => this._event$.next(event));

          // Emits when the session attempted to connect but was unsuccessful.
          session.on(SessionEventCode.CONNECT_FAILED_ERROR, (event: SessionEvent) => {
            this._event$.next(event);
            reject(event);
          });

          // When the session connect operation failed, or the session that was once up, is now disconnected.
          session.on(SessionEventCode.DISCONNECTED, (event: SessionEvent) => this._event$.next(event));

          // When the session has gone down, and an automatic reconnection attempt is in progress.
          session.on(SessionEventCode.RECONNECTING_NOTICE, (event: SessionEvent) => this._event$.next(event));

          // When a direct message was received on the session.
          session.on(SessionEventCode.MESSAGE, (message: Message): void => this._message$.next(message));

          // When a subscribe or unsubscribe operation succeeded.
          session.on(SessionEventCode.SUBSCRIPTION_OK, (event: SessionEvent) => this._event$.next(event));

          // When a subscribe or unsubscribe operation was rejected by the broker.
          session.on(SessionEventCode.SUBSCRIPTION_ERROR, (event: SessionEvent) => this._event$.next(event));

          // When a message published with a guaranteed message delivery strategy, that is {@link MessageDeliveryModeType.PERSISTENT} or {@link MessageDeliveryModeType.NON_PERSISTENT}, was acknowledged by the router.
          session.on(SessionEventCode.ACKNOWLEDGED_MESSAGE, (event: SessionEvent) => this._event$.next(event));

          // When a message published with a guaranteed message delivery strategy, that is {@link MessageDeliveryModeType.PERSISTENT} or {@link MessageDeliveryModeType.NON_PERSISTENT}, was rejected by the router.
          session.on(SessionEventCode.REJECTED_MESSAGE_ERROR, (event: SessionEvent) => this._event$.next(event));

          session.connect();
        }
        catch (e) {
          reject(e);
        }
      });
    })));
  }

  public async disconnect(): Promise<void> {
    const session = await this._session;
    if (!session) {
      return; // already disconnected
    }

    // Disconnect the session gracefully from the Solace event broker.
    // Gracefully means waiting for the 'DISCONNECT' confirmation event before disposing the session,
    // so that the broker can cleanup resources accordingly.
    const whenDisconnected = this.whenEvent(SessionEventCode.DISCONNECTED).then(() => this.dispose());
    this._zone.runOutsideAngular(() => session.disconnect());
    await whenDisconnected;
  }

  private async dispose(): Promise<void> {
    const session = await this._session;
    if (!session) {
      return; // already disposed
    }

    this._session = null;
    this._subscriptionExecutor.destroy();
    this._subscriptionCounter.destroy();
    session.dispose();
    this._sessionDisposed$.next();
  }

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return new Observable((observer: Observer<MessageEnvelope>): TeardownLogic => {
      const unsubscribe$ = new Subject<void>();

      // Replace named segments with a single-level wildcard character (`*`).
      const solaceTopic = topic.split('/').map(segment => isNamedWildcardSegment(segment) ? '*' : segment).join('/');

      // Complete the Observable when the session died.
      this._sessionDisposed$
        .pipe(
          take(1),
          takeUntil(unsubscribe$),
        )
        .subscribe(() => observer.complete());

      this.session
        .then(() => {
          // Create Observable that errors when failed to subscribe to the topic
          let subscriptionErrored = false;
          const subscriptionError$ = new Subject<void>();

          // Filter messages sent to the given topic.
          merge<Message>(this._message$, subscriptionError$)
            .pipe(
              assertNotInAngularZone(),
              filter(message => this._topicMatcher.matchesSubscriptionTopic(message.getDestination().getName(), solaceTopic)),
              mapToMessageEnvelope(topic),
              observeInside(continueFn => this._zone.run(continueFn)),
              takeUntil(merge(this._sessionDisposed$, unsubscribe$)),
              finalize(async () => {
                // Unsubscribe from the topic on the Solace session, but only if being the last subscription on that topic and if successfully subscribed to the Solace broker.
                if (this._subscriptionCounter.decrementAndGet(solaceTopic) === 0 && !subscriptionErrored) {
                  this.unsubscribeFromTopic(solaceTopic);
                }
              }),
            )
            .subscribe(observer);

          // Subscribe to the topic on the Solace session, but only if being the first subscription on that topic.
          if (this._subscriptionCounter.incrementAndGet(solaceTopic) === 1) {
            this.subscribeToTopic(solaceTopic, options).then(success => {
              if (!success) {
                subscriptionErrored = true;
                subscriptionError$.error(`[SolaceMessageClient] Failed to subscribe to topic ${solaceTopic}.`);
              }
            });
          }
        })
        .catch(error => {
          observer.error(error);
        });

      return (): void => {
        unsubscribe$.next();
      };
    });
  }

  /**
   * Subscribes to the given topic on the Solace session.
   */
  private subscribeToTopic(topic: string, subscribeOptions: ObserveOptions): Promise<boolean> {
    // Calls to `solace.Session.subscribe` and `solace.Session.unsubscribe` must be executed one after the other until the Solace Broker confirms
    // the operation. Otherwise a previous unsubscribe may cancel a later subscribe on the same topic.
    return this._subscriptionExecutor.scheduleSerial(async () => {
      try {
        // IMPORTANT: Do not subscribe when the session is down, that is, after received a DOWN_ERROR. Otherwise, solclientjs would crash.
        // When the session is down, the session Promise resolves to `null`.
        const session = await this._session;
        if (!session) {
          return false;
        }

        const subscribeCorrelationKey = UUID.randomUUID();
        const whenSubscribed = this.whenEvent(SessionEventCode.SUBSCRIPTION_OK, {rejectOnEvent: SessionEventCode.SUBSCRIPTION_ERROR, correlationKey: subscribeCorrelationKey})
          .then(() => true)
          .catch(event => {
            console.warn(`[SolaceMessageClient] Solace event broker rejected subscription on topic ${topic}.`, event); // tslint:disable-line:no-console
            return false;
          });

        session.subscribe(
          SolaceObjectFactory.createTopicDestination(topic),
          true,
          subscribeCorrelationKey,
          subscribeOptions && subscribeOptions.requestTimeout,
        );
        return whenSubscribed;
      }
      catch (error) {
        return false;
      }
    });
  }

  /**
   * Unsubscribes from the given topic on the Solace session.
   */
  private unsubscribeFromTopic(topic: string): Promise<boolean> {
    // Calls to `solace.Session.subscribe` and `solace.Session.unsubscribe` must be executed one after the other until the Solace Broker confirms
    // the operation. Otherwise a previous unsubscribe may cancel a later subscribe on the same topic.
    return this._subscriptionExecutor.scheduleSerial(async () => {
      try {
        // IMPORTANT: Do not unsubscribe when the session is down, that is, after received a DOWN_ERROR. Otherwise, solclientjs would crash.
        // When the session is down, the session Promise resolves to `null`.
        const session = await this._session;
        if (!session) {
          return false;
        }

        const unsubscribeCorrelationKey = UUID.randomUUID();
        const whenUnsubscribed = this.whenEvent(SessionEventCode.SUBSCRIPTION_OK, {rejectOnEvent: SessionEventCode.SUBSCRIPTION_ERROR, correlationKey: unsubscribeCorrelationKey})
          .then(() => true)
          .catch(event => {
            console.warn(`[SolaceMessageClient] Solace event broker rejected unsubscription on topic ${topic}.`, event); // tslint:disable-line:no-console
            return false;
          });

        session.unsubscribe(
          SolaceObjectFactory.createTopicDestination(topic),
          true,
          unsubscribeCorrelationKey,
          undefined,
        );
        return whenUnsubscribed;
      }
      catch (error) {
        return false;
      }
    });
  }

  public publish(topic: string, data?: Data | Message, options?: PublishOptions): Promise<void> {
    const destination = SolaceObjectFactory.createTopicDestination(topic);
    return this.sendToDestination(destination, data, options);
  }

  public enqueue(queue: string, data?: Data | Message, options?: PublishOptions): Promise<void> {
    const destination = SolaceObjectFactory.createDurableQueueDestination(queue);
    return this.sendToDestination(destination, data, options);
  }

  private async sendToDestination(destination: Destination, data?: ArrayBufferLike | DataView | string | SDTField | Message, options?: PublishOptions): Promise<void> {
    const message: Message = data instanceof solace.Message ? (data as Message) : SolaceObjectFactory.createMessage();
    message.setDestination(destination);
    message.setDeliveryMode(message.getDeliveryMode() ?? MessageDeliveryModeType.DIRECT);

    // Set data, either as unstructured byte data, or as structured container if passed a structured data type (SDT).
    if (data !== undefined && data !== null && !(data instanceof solace.Message)) {
      if (data instanceof solace.SDTField) {
        message.setSdtContainer(data as SDTField);
      }
      else {
        message.setBinaryAttachment(data as ArrayBufferLike | DataView | string);
      }
    }

    // Apply publish options.
    if (options) {
      message.setDeliveryMode(options.deliveryMode ?? message.getDeliveryMode());
      message.setCorrelationId(options.correlationId);
      message.setPriority(options.priority ?? message.getPriority());
      message.setTimeToLive(options.timeToLive ?? message.getTimeToLive());
      message.setDMQEligible(options.dmqEligible ?? message.isDMQEligible());
      message.setCorrelationKey(options.correlationKey ?? message.getCorrelationKey());
    }

    // Add headers.
    if (options?.headers?.size) {
      message.setUserPropertyMap(message.getUserPropertyMap() || SolaceObjectFactory.createSDTMapContainer());
      options.headers.forEach((value, key) => {
        if (value === undefined || value === null) {
          return;
        }
        if (value instanceof solace.SDTField) {
          const sdtField = value as SDTField;
          message.getUserPropertyMap().addField(key, sdtField.getType(), sdtField.getValue());
        }
        else if (typeof value === 'string') {
          message.getUserPropertyMap().addField(key, SDTFieldType.STRING, value);
        }
        else if (typeof value === 'boolean') {
          message.getUserPropertyMap().addField(key, SDTFieldType.BOOL, value);
        }
        else if (typeof value === 'number') {
          message.getUserPropertyMap().addField(key, SDTFieldType.INT32, value);
        }
        else {
          message.getUserPropertyMap().addField(key, SDTFieldType.UNKNOWN, value);
        }
      });
    }

    // Allow intercepting the message before sending it to the broker.
    options?.intercept?.(message);

    const session = await this.session;

    // Publish the message.
    if (message.getDeliveryMode() === MessageDeliveryModeType.DIRECT) {
      session.send(message);
      return;
    }

    // When publishing a message with a guaranteed message delivery strategy, resolve the Promise when acknowledged by the broker, or reject it otherwise.
    const correlationKey = message.getCorrelationKey() || UUID.randomUUID();
    const whenAcknowledged = this.whenEvent(SessionEventCode.ACKNOWLEDGED_MESSAGE, {rejectOnEvent: SessionEventCode.REJECTED_MESSAGE_ERROR, correlationKey: correlationKey});
    message.setCorrelationKey(correlationKey);
    session.send(message);
    await whenAcknowledged;
  }

  public get session(): Promise<Session> {
    return this._session || Promise.reject('[SolaceMessageClient] Not connected to the Solace message broker. Did you forget to initialize the `SolaceClient` via `SolaceMessageClientModule.forRoot({...}) or to invoke \'connect\'`?');
  }

  /**
   * Returns a Promise that resolves to the event when the expected event occurs, or that rejects when the specified `rejectOnEvent` event, if specified, occurs.
   * If a "correlation key" is specified, only events with that correlation key will be evaluated.
   *
   * Note that:
   * - the Promise resolves or rejects outside the Angular zone
   * - the Promise is bound the current session, i.e., will ony be settled as long as the current session is not disposed.
   */
  private whenEvent(resolveOnEvent: SessionEventCode, options?: { rejectOnEvent?: SessionEventCode; correlationKey?: string; }): Promise<SessionEvent> {
    return this._event$
      .pipe(
        assertNotInAngularZone(),
        filter(event => !options?.correlationKey || event.correlationKey === options.correlationKey),
        mergeMap(event => {
          switch (event.sessionEventCode) {
            case resolveOnEvent:
              return of(event);
            case options?.rejectOnEvent: {
              return throwError(event);
            }
            default:
              return EMPTY;
          }
        }),
        take(1),
        takeUntil(this._sessionDisposed$),
      )
      .toPromise()
      .then(event => {
        if (event === undefined) {
          return new Promise(noop); // do not resolve the Promise when the session is disposed
        }
        return event;
      });
  }

  private initSolaceClientFactory(): void {
    const factoryProperties = new solace.SolclientFactoryProperties();
    factoryProperties.profile = solace.SolclientFactoryProfiles.version10_5;
    factoryProperties.logLevel = solace.LogLevel.INFO;
    solace.SolclientFactory.init(factoryProperties);
  }

  private disposeWhenSolaceSessionDied(): void {
    this._event$
      .pipe(
        filter(event => SESSION_DIED_EVENTS.has(event.sessionEventCode)),
        assertNotInAngularZone(),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.dispose();
      });
  }

  private logSolaceSessionEvents(): void {
    console.debug && this._event$ // tslint:disable-line:no-console
      .pipe(
        assertNotInAngularZone(),
        takeUntil(this._destroy$),
      )
      .subscribe((event: SessionEvent) => {
        console.debug(`[SolaceMessageClient] solclientjs session event:  ${solace.SessionEventCode.nameOf(event.sessionEventCode)}`, event); // tslint:disable-line:no-console
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this.disconnect().then();
  }
}

/**
 * Maps each {@link Message} to a {@link MessageEnvelope}, and resolves substituted named wildcard segments.
 */
function mapToMessageEnvelope(subscriptionTopic: string): OperatorFunction<Message, MessageEnvelope> {
  const subscriptionSegments = subscriptionTopic.split('/');
  return map((message: Message): MessageEnvelope => {
    // collect params
    const destinationSegments = message.getDestination().getName().split('/');
    const params = subscriptionSegments.reduce((acc, subscriptionSegment, i) => {
      if (isNamedWildcardSegment(subscriptionSegment)) {
        return acc.set(subscriptionSegment.substr(1), destinationSegments[i]);
      }
      return acc;
    }, new Map<string, string>());

    // collect headers
    const userPropertyMap = message.getUserPropertyMap();
    const headers = userPropertyMap?.getKeys().reduce((acc, key) => {
      return acc.set(key, userPropertyMap.getField(key).getValue());
    }, new Map()) || new Map();

    return {message, params, headers};
  });
}

function isNamedWildcardSegment(segment: string): boolean {
  return segment.startsWith(':') && segment.length > 1;
}

/**
 * Set of events indicating final disconnection from the broker with no recovery possible.
 */
const SESSION_DIED_EVENTS = new Set<number>()
  .add(SessionEventCode.DOWN_ERROR) // is emitted when reaching the limit of connection retries after a connection interruption
  .add(SessionEventCode.DISCONNECTED); // is emitted when disconnected from the session
/**
 * Set of events indicating a connection to be established.
 */
const CONNECTION_ESTABLISHED_EVENTS = new Set<number>()
  .add(SessionEventCode.UP_NOTICE)
  .add(SessionEventCode.RECONNECTED_NOTICE);

/**
 * Set of events indicating a connection to be lost.
 */
const CONNECTION_LOST_EVENTS = new Set<number>()
  .add(SessionEventCode.DOWN_ERROR)
  .add(SessionEventCode.CONNECT_FAILED_ERROR)
  .add(SessionEventCode.DISCONNECTED)
  .add(SessionEventCode.RECONNECTING_NOTICE);

/**
 * Throws if emitting inside the Angular zone.
 */
function assertNotInAngularZone<T>(): MonoTypeOperatorFunction<T> {
  return tap(() => NgZone.assertNotInAngularZone());
}
