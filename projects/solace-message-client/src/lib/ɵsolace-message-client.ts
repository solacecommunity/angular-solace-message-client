import * as solace from 'solclientjs/lib-browser/solclient-full';
import { Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
import { ConnectableObservable, EMPTY, merge, MonoTypeOperatorFunction, noop, Observable, Observer, of, OperatorFunction, Subject, TeardownLogic } from 'rxjs';
import { distinctUntilChanged, filter, finalize, map, mergeMap, publishReplay, take, takeUntil, tap } from 'rxjs/operators';
import { UUID } from '@scion/toolkit/uuid';
import { MessageBodyFormat, MessageEnvelope, ObserveOptions, PublishOptions, SolaceMessageClient } from './solace-message-client';
import { TopicMatcher } from './topic-matcher';
import { observeInside } from '@scion/toolkit/operators';
import { SolaceSessionProvider } from './solace-session-provider';
import { SolaceMessageClientConfig } from './solace-message-client.config';
import { SessionProperties } from './solace.model';
import { TopicSubscriptionCounter } from './topic-subscription-counter';
import { SerialExecutor } from './serial-executor.service';

@Injectable()
export class ɵSolaceMessageClient implements SolaceMessageClient, OnDestroy { // tslint:disable-line:class-name

  private _destroy$ = new Subject<void>();
  private _message$ = new Subject<solace.Message>();
  private _event$ = new Subject<solace.SessionEvent>();

  private _session: Promise<solace.Session>;
  private _whenDestroy = this._destroy$.pipe(take(1)).toPromise();
  private _sessionDispose$ = new Subject<void>();

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

          const session: solace.Session = this._sessionProvider.provide(new solace.SessionProperties(sessionProperties));

          // When the Session is ready to send/receive messages and perform control operations.
          session.on(solace.SessionEventCode.UP_NOTICE, (event: solace.SessionEvent) => {
            this._event$.next(event);
            resolve(session);
          });

          // When the session has gone down, and an automatic reconnection attempt is in progress.
          session.on(solace.SessionEventCode.RECONNECTED_NOTICE, (event: solace.SessionEvent) => this._event$.next(event));

          // Emits when the session was established and then went down.
          session.on(solace.SessionEventCode.DOWN_ERROR, (event: solace.SessionEvent) => this._event$.next(event));

          // Emits when the session attempted to connect but was unsuccessful.
          session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (event: solace.SessionEvent) => {
            this._event$.next(event);
            reject(event);
          });

          // When the session connect operation failed, or the session that was once up, is now disconnected.
          session.on(solace.SessionEventCode.DISCONNECTED, (event: solace.SessionEvent) => this._event$.next(event));

          // When the session has gone down, and an automatic reconnection attempt is in progress.
          session.on(solace.SessionEventCode.RECONNECTING_NOTICE, (event: solace.SessionEvent) => this._event$.next(event));

          // When a direct message was received on the session.
          session.on(solace.SessionEventCode.MESSAGE, (message: solace.Message): void => this._message$.next(message));

          // When a subscribe or unsubscribe operation succeeded.
          session.on(solace.SessionEventCode.SUBSCRIPTION_OK, (event: solace.SessionEvent) => this._event$.next(event));

          // When a subscribe or unsubscribe operation is rejected by the broker.
          session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, (event: solace.SessionEvent) => this._event$.next(event));

          session.connect();
        }
        catch (e) {
          reject(e);
        }
      });
    })));
  }

  public async disconnect(): Promise<void> {
    const session = this._session;
    if (!session) {
      return;
    }

    this._session = null;
    this._sessionDispose$.next();
    this._subscriptionExecutor.destroy();
    this._subscriptionCounter.destroy();

    await this._zone.runOutsideAngular(() => session.then(it => {
      // Disconnect the session gracefully.
      it.disconnect();
      // Release all resources associated with the session.
      it.dispose();
    }));
  }

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return new Observable((observer: Observer<MessageEnvelope>): TeardownLogic => {
      const unsubscribe$ = new Subject<void>();

      // Replace named segments with a single-level wildcard character (`*`).
      const solaceTopic = topic.split('/').map(segment => isNamedWildcardSegment(segment) ? '*' : segment).join('/');

      this._sessionDispose$
        .pipe(takeUntil(merge(unsubscribe$, this._destroy$)))
        .subscribe(() => observer.complete());

      this.session
        .then(() => {
          // Create Observable that errors when failed to subscribe to the topic
          let subscriptionErrored = false;
          const subscriptionError$ = new Subject<void>();

          // Filter messages sent to the given topic.
          merge(this._message$, subscriptionError$)
            .pipe(
              assertNotInAngularZone(),
              filter(message => this._topicMatcher.matchesSubscriptionTopic(message.getDestination().getName(), solaceTopic)),
              mapToMessageEnvelope(topic),
              observeInside(continueFn => this._zone.run(continueFn)),
              takeUntil(merge(this._destroy$, unsubscribe$)),
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
      // IMPORTANT: Do not subscribe when the session is down, that is, after received a DOWN_ERROR. Otherwise, solclientjs would crash.
      // When the session is down, the session Promise resolves to `null`.
      const session = await this._session;
      if (!session) {
        return false;
      }

      const subscribeCorrelationKey = UUID.randomUUID();
      const whenSubscribed = this.whenSubscriptionConfirmed(subscribeCorrelationKey, {topic, operation: 'subscribe'});

      session.subscribe(
        solace.SolclientFactory.createTopicDestination(topic),
        true,
        subscribeCorrelationKey,
        subscribeOptions && subscribeOptions.requestTimeout,
      );
      return whenSubscribed;
    });
  }

  /**
   * Unsubscribes from the given topic on the Solace session.
   */
  private unsubscribeFromTopic(topic: string): Promise<boolean> {
    // Calls to `solace.Session.subscribe` and `solace.Session.unsubscribe` must be executed one after the other until the Solace Broker confirms
    // the operation. Otherwise a previous unsubscribe may cancel a later subscribe on the same topic.
    return this._subscriptionExecutor.scheduleSerial(async () => {
      // IMPORTANT: Do not unsubscribe when the session is down, that is, after received a DOWN_ERROR. Otherwise, solclientjs would crash.
      // When the session is down, the session Promise resolves to `null`.
      const session = await this._session;
      if (!session) {
        return false;
      }

      const unsubscribeCorrelationKey = UUID.randomUUID();
      const whenUnsubscribed = this.whenSubscriptionConfirmed(unsubscribeCorrelationKey, {topic, operation: 'unsubscribe'});

      session.unsubscribe(
        solace.SolclientFactory.createTopicDestination(topic),
        true,
        unsubscribeCorrelationKey,
        undefined,
      );
      return whenUnsubscribed;
    });
  }

  /**
   * Promise that resolves to `true` when the Solace broker reports that the subscribe or unsubscribe operation succeeded, or that
   * resolves to `false` otherwise. The Promise is never rejected.
   *
   * In order not to miss the Solace confirmation, this method must be called before the actual subscription or unsubscription.
   */
  private whenSubscriptionConfirmed(correlationKey: string, logContext: { topic: string, operation: 'subscribe' | 'unsubscribe' }): Promise<boolean> {
    return this._event$
      .pipe(
        assertNotInAngularZone(),
        filter(event => event.correlationKey === correlationKey),
        mergeMap(event => {
          if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_OK) {
            return of(true);
          }
          if (event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_ERROR) {
            console.warn('[SolaceMessageClient] Subscription or unsubscription rejected by the Solace broker:', logContext, event); // tslint:disable-line:no-console
            return of(false);
          }
          return EMPTY;
        }),
        take(1),
        takeUntil(this._destroy$),
      )
      .toPromise()
      .then((success: boolean | undefined) => {
        if (success === undefined) {
          return new Promise(noop); // do not resolve the Promise on shutdown
        }
        return Promise.resolve(success);
      });
  }

  public async publish<T>(topic: string, payload: T | solace.Message | undefined, options?: PublishOptions): Promise<void> {
    const isSolaceMessage = typeof payload === 'object' && payload.constructor === solace.Message;
    const message = isSolaceMessage ? payload : solace.SolclientFactory.createMessage();
    message.setDestination(message.getDestination() || solace.SolclientFactory.createTopicDestination(topic));

    const session = await this.session;
    if (isSolaceMessage) {
      session.send(message);
      return;
    }

    if (options) {
      message.setDeliveryMode(options.deliveryMode ?? solace.MessageDeliveryModeType.DIRECT);
      message.setCorrelationId(options.correlationId);
      message.setPriority(options.priority ?? message.getPriority());
      message.setTimeToLive(options.timeToLive ?? message.getTimeToLive());
      message.setDMQEligible(options.dmqEligible ?? message.isDMQEligible());
    }

    if (payload) {
      const format = options?.format ?? MessageBodyFormat.JSON;
      if (typeof format === 'function') {
        message.setSdtContainer(format(payload));
      }
      else {
        switch (format) {
          case MessageBodyFormat.TEXT: {
            message.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, payload));
            break;
          }
          case MessageBodyFormat.BINARY: {
            message.setBinaryAttachment(payload);
            break;
          }
          case MessageBodyFormat.JSON:
          default: {
            message.setBinaryAttachment(JSON.stringify(payload));
            break;
          }
        }
      }
    }
    session.send(message);
  }

  public get session(): Promise<solace.Session> {
    return this._session || Promise.reject('[SolaceMessageClient] Not connected to the Solace message broker. Did you forget to initialize the `SolaceClient` via `SolaceMessageClientModule.forRoot({...}) or to invoke \'connect\'`?');
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
        this.disconnect().then();
      });
  }

  private logSolaceSessionEvents(): void {
    console.debug && this._event$ // tslint:disable-line:no-console
      .pipe(
        assertNotInAngularZone(),
        takeUntil(this._destroy$),
      )
      .subscribe((event: solace.SessionEvent) => {
        console.debug(`[SolaceMessageClient] solclientjs session event:  ${solace.SessionEventCode.nameOf(event.sessionEventCode)}`, event); // tslint:disable-line:no-console
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this.disconnect().then();
  }
}

/**
 * Maps each {@link solace.Message} to a {@link MessageEnvelope}, and resolves substituted named wildcard segments.
 */
function mapToMessageEnvelope(subscriptionTopic: string): OperatorFunction<solace.Message, MessageEnvelope> {
  const subscriptionSegments = subscriptionTopic.split('/');
  return map((message: solace.Message): MessageEnvelope => {
    const destinationSegments = message.getDestination().getName().split('/');
    return {
      message,
      params: subscriptionSegments.reduce((params, subscriptionSegment, i) => {
        if (isNamedWildcardSegment(subscriptionSegment)) {
          return params.set(subscriptionSegment.substr(1), destinationSegments[i]);
        }
        return params;
      }, new Map()),
    };
  });
}

function isNamedWildcardSegment(segment: string): boolean {
  return segment.startsWith(':') && segment.length > 1;
}

/**
 * Set of events indicating final disconnection from the broker with no recovery possible.
 */
const SESSION_DIED_EVENTS = new Set<number>()
  .add(solace.SessionEventCode.DOWN_ERROR) // is emitted when reaching the limit of connection retries after a connection interruption
  .add(solace.SessionEventCode.DISCONNECTED); // is emitted when disconnected from the session
/**
 * Set of events indicating a connection to be established.
 */
const CONNECTION_ESTABLISHED_EVENTS = new Set<number>()
  .add(solace.SessionEventCode.UP_NOTICE)
  .add(solace.SessionEventCode.RECONNECTED_NOTICE);

/**
 * Set of events indicating a connection to be lost.
 */
const CONNECTION_LOST_EVENTS = new Set<number>()
  .add(solace.SessionEventCode.DOWN_ERROR)
  .add(solace.SessionEventCode.CONNECT_FAILED_ERROR)
  .add(solace.SessionEventCode.DISCONNECTED)
  .add(solace.SessionEventCode.RECONNECTING_NOTICE);

/**
 * Throws if emitting inside the Angular zone.
 */
function assertNotInAngularZone<T>(): MonoTypeOperatorFunction<T> {
  return tap(() => NgZone.assertNotInAngularZone());
}
