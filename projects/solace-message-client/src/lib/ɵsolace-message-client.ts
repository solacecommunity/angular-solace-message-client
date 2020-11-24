import * as solace from 'solclientjs/lib-browser/solclient-full';
import { Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
import { ConnectableObservable, merge, MonoTypeOperatorFunction, Observable, Observer, OperatorFunction, Subject, TeardownLogic, throwError } from 'rxjs';
import { distinctUntilChanged, filter, finalize, map, mergeMapTo, publishReplay, take, takeUntil, tap } from 'rxjs/operators';
import { UUID } from '@scion/toolkit/uuid';
import { MessageBodyFormat, MessageEnvelope, ObserveOptions, PublishOptions, SolaceMessageClient } from './solace-message-client';
import { TopicMatcher } from './topic-matcher';
import { observeInside } from '@scion/toolkit/operators';
import { SolaceSessionProvider } from './solace-session-provider';
import { SolaceMessageClientConfig } from './solace-message-client.config';
import { SessionProperties } from './solace.model';

@Injectable()
export class ɵSolaceMessageClient implements SolaceMessageClient, OnDestroy { // tslint:disable-line:class-name

  private _destroy$ = new Subject<void>();
  private _message$ = new Subject<solace.Message>();
  private _event$ = new Subject<solace.SessionEvent>();

  private _subscriptionCounts = new Map<string, number>();
  private _session: Promise<solace.Session>;
  private _whenDestroy = this._destroy$.pipe(take(1)).toPromise();
  private _sessionDispose$ = new Subject<void>();

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
          session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, (event: solace.SessionEvent) => this._event$.next(event));

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

    await this._zone.runOutsideAngular(() => session.then(it => {
      // Disconnect the session. The session attempts to disconnect cleanly, concluding all operations in progress. The disconnected session
      // event solace.SessionEventCode#event:DISCONNECTED is emitted when these operations complete and the session has completely disconnected.
      it.disconnect();
      // Release all resources associated with the session. It is recommended to call disconnect() first for proper handshake with the message-router.
      it.dispose();
    }));
  }

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return new Observable((observer: Observer<MessageEnvelope>): TeardownLogic => {
      const unsubscribe$ = new Subject<void>();
      const correlationKey = UUID.randomUUID();
      // Replace named segments with a single-level wildcard character (`*`).
      const solaceTopic = topic.split('/').map(segment => isNamedWildcardSegment(segment) ? '*' : segment).join('/');

      this._sessionDispose$
        .pipe(takeUntil(merge(unsubscribe$, this._destroy$)))
        .subscribe(() => observer.complete());

      this.session
        .then(session => {
          // Create Observable that errors when failed to subscribe to the topic
          let subscriptionErrored = false;
          const subscriptionError$ = this._event$
            .pipe(
              filter(event => event.sessionEventCode === solace.SessionEventCode.SUBSCRIPTION_ERROR),
              filter(event => event.correlationKey === correlationKey),
              tap(() => subscriptionErrored = true),
              mergeMapTo(throwError(`[SolaceMessageClient] Failed to subscribe to topic ${solaceTopic}.`)),
            );

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
                // IMPORTANT: Do not unsubscribe from the Solace session after a DOWN_ERROR, as solclientjs would enter an invalid state and crash.
                //            In such case, the current session instance was set to `null`.
                if (this.decrementTopicSubscriptionCountAndGet(solaceTopic) === 0 && !subscriptionErrored) {
                  (await this._session)?.unsubscribe(
                    solace.SolclientFactory.createTopicDestination(solaceTopic),
                    false,
                    undefined,
                    undefined,
                  );
                }
              }),
            )
            .subscribe(observer);

          // Subscribe to the topic in the Solace broker.
          if (this.incrementTopicSubscriptionCountAndGet(solaceTopic) === 1) {
            session.subscribe(
              solace.SolclientFactory.createTopicDestination(solaceTopic),
              true,
              correlationKey,
              options && options.requestTimeout,
            );
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

  private incrementTopicSubscriptionCountAndGet(topic: string): number {
    const count = (this._subscriptionCounts.get(topic) || 0) + 1;
    this._subscriptionCounts.set(topic, count);
    return count;
  }

  private decrementTopicSubscriptionCountAndGet(topic: string): number {
    const count = Math.max(0, (this._subscriptionCounts.get(topic) || 0) - 1);
    if (count === 0) {
      this._subscriptionCounts.delete(topic);
    }
    else {
      this._subscriptionCounts.set(topic, count);
    }
    return count;
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
