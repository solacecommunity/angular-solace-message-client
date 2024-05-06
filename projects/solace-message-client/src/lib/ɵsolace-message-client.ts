import {inject, Injectable, Injector, NgZone, OnDestroy} from '@angular/core';
import {EMPTY, EmptyError, firstValueFrom, identity, merge, MonoTypeOperatorFunction, noop, Observable, Observer, of, OperatorFunction, ReplaySubject, share, shareReplay, skip, Subject, TeardownLogic, throwError} from 'rxjs';
import {distinctUntilChanged, filter, finalize, map, mergeMap, take, takeUntil, tap} from 'rxjs/operators';
import {UUID} from '@scion/toolkit/uuid';
import {BrowseOptions, ConsumeOptions, Data, MessageEnvelope, ObserveOptions, PublishOptions, RequestOptions, SolaceMessageClient} from './solace-message-client';
import {TopicMatcher} from './topic-matcher';
import {observeInside} from '@scion/toolkit/operators';
import {SolaceSessionProvider} from './solace-session-provider';
import {OAuthAccessTokenProvider} from './oauth-access-token-provider';
import {SOLACE_MESSAGE_CLIENT_CONFIG, SolaceMessageClientConfig} from './solace-message-client.config';
import {AuthenticationScheme, Destination, Message, MessageConsumer, MessageConsumerEventName, MessageConsumerProperties, MessageDeliveryModeType, OperationError, QueueBrowser, QueueBrowserEventName, QueueBrowserProperties, QueueDescriptor, QueueType, RequestError, SDTField, SDTFieldType, SDTMapContainer, Session, SessionEvent, SessionEventCode, SessionProperties as SolaceSessionProperties, SolclientFactory, SolclientFactoryProfiles, SolclientFactoryProperties} from 'solclientjs';
import {TopicSubscriptionCounter} from './topic-subscription-counter';
import {SerialExecutor} from './serial-executor.service';
import {Logger} from './logger';

@Injectable()
export class ɵSolaceMessageClient implements SolaceMessageClient, OnDestroy {

  private _message$ = new Subject<Message>();
  private _event$ = new Subject<SessionEvent>();

  private _session: Promise<Session> | null = null;
  private _destroy$ = new Subject<void>();
  private _sessionDisposed$ = new Subject<void>();

  private _subscriptionExecutor: SerialExecutor | null = null;
  private _subscriptionCounter: TopicSubscriptionCounter | null = null;

  public connected$: Observable<boolean>;

  constructor(private _sessionProvider: SolaceSessionProvider,
              private _injector: Injector,
              private _logger: Logger,
              private _zone: NgZone) {
    this.initSolaceClientFactory();
    this.disposeWhenSolaceSessionDied();
    this.logSolaceSessionEvents();
    this.connected$ = this.monitorConnectionState$();

    // Auto connect to the Solace broker if having provided a module config.
    const config = inject(SOLACE_MESSAGE_CLIENT_CONFIG, {optional: true});
    if (config) {
      this.connect(config).catch(error => this._logger.error('Failed to connect to the Solace message broker.', error));
    }
  }

  public async connect(config: SolaceMessageClientConfig): Promise<Session> {
    if (!config) {
      throw Error('Missing required config for connecting to the Solace message broker.');
    }

    return (this._session || (this._session = new Promise((resolve, reject) => {
      // Apply session defaults.
      const sessionProperties: SolaceMessageClientConfig = {
        reapplySubscriptions: true, // remember subscriptions after a network interruption (default value if not set)
        reconnectRetries: -1, // Try to restore the connection automatically after a network interruption (default value if not set)
        ...config,
      };

      this._logger.debug('Connecting to Solace message broker:', obfuscateSecrets(sessionProperties));

      this._zone.runOutsideAngular(async () => {
        this._subscriptionExecutor = new SerialExecutor(this._logger);
        this._subscriptionCounter = new TopicSubscriptionCounter();

        // If using OAUTH2 authentication scheme, create access token Observable to continuously inject a valid access token into the Solace session.
        const oAuth2Scheme = config.authenticationScheme === AuthenticationScheme.OAUTH2;
        const accessToken$: Observable<string> | null = oAuth2Scheme ? this.provideOAuthAccessToken$(config).pipe(shareReplay({bufferSize: 1, refCount: false})) : null;

        // If using OAUTH2 authentication scheme, set the initial access token via session properties.
        if (accessToken$) {
          sessionProperties.accessToken = await firstValueFrom(accessToken$).catch(mapEmptyError(() => Error('[EmptyAccessTokenError] Access token Observable has completed without emitted an access token.')));
        }

        // Create the Solace session.
        const session: Session = this._sessionProvider.provide(new SolaceSessionProperties(sessionProperties));

        // Provide the session with a valid "OAuth 2.0 Access Token".
        // The Observable is expected to never complete and continuously emit a renewed token short before expiration of the previously emitted token.
        accessToken$ && accessToken$
          .pipe(
            skip(1), // initial access token is set via session properties
            takeUntil(this._sessionDisposed$),
          )
          .subscribe({
            next: accessToken => {
              this._logger.debug('Injecting "OAuth 2.0 Access Token" into Solace session.', accessToken);
              session.updateAuthenticationOnReconnect({accessToken});
            },
            complete: () => {
              if (this._session) {
                this._logger.warn('[AccessTokenProviderCompletedWarning] Observable providing access token(s) to the Solace session has completed. The Observable should NEVER complete and continuously emit the renewed token short before expiration of the previously emitted token. Otherwise, the connection to the broker would not be re-established in the event of a network interruption.');
              }
            },
            error: error => {
              this._logger.error(error);
            },
          });

        // When the Session is ready to send/receive messages and perform control operations.
        session.on(SessionEventCode.UP_NOTICE, (event: SessionEvent) => {
          this._event$.next(event);
          this._logger.debug('Connected to Solace message broker.', obfuscateSecrets(config));
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
      }).catch(error => reject(error));
    })));
  }

  /**
   * Provides the OAuth access token as configured in {@link SolaceMessageClientConfig#accessToken} as Observable.
   * The Observable errors if not using OAUTH2 authentication scheme, or if no token/provider is configured.
   */
  private provideOAuthAccessToken$(config: SolaceMessageClientConfig): Observable<string> {
    if (config.authenticationScheme !== AuthenticationScheme.OAUTH2) {
      return throwError(() => `Expected authentication scheme to be  ${AuthenticationScheme.OAUTH2}, but was ${config.authenticationScheme}.`);
    }

    const accessTokenOrAccessTokenProvider = config.accessToken;
    const accessToken$ = (() => {
      switch (typeof accessTokenOrAccessTokenProvider) {
        case 'string': {
          return of(accessTokenOrAccessTokenProvider);
        }
        case 'function': {
          const provider = this._injector.get<OAuthAccessTokenProvider | null>(accessTokenOrAccessTokenProvider, null);
          if (!provider) {
            return throwError(() => Error(`[NullAccessTokenProviderError] No provider for ${accessTokenOrAccessTokenProvider.name} found. Did you forget to register it? You can register it as follows: "@Injectable({providedIn: 'root'})"`));
          }
          return provider.provide$();
        }
        default: {
          return throwError(() => Error('[NullAccessTokenConfigError] No access token or provider configured in \'SolaceMessageClientConfig.accessToken\'. An access token is required for OAUTH2 authentication. It is recommended to provide the token via `OAuthAccessTokenProvider`.'));
        }
      }
    })();

    return accessToken$.pipe(mergeMap(accessToken => accessToken ? of(accessToken) : throwError(() => Error('[NullAccessTokenError] Invalid "OAuth 2.0 Access Token". Token must not be `null` or `undefined`.'))));
  }

  public async disconnect(): Promise<void> {
    const session = await this._session?.catch(noop); // do not error on disconnect
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

  public dispose(): void {
    this._session?.then(session => session.dispose()).catch(noop); // do not error on dispose
    this._session = null;

    this._subscriptionExecutor?.destroy();
    this._subscriptionExecutor = null;

    this._subscriptionCounter?.destroy();
    this._subscriptionCounter = null;

    this._sessionDisposed$.next();
  }

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return new Observable((observer: Observer<MessageEnvelope>): TeardownLogic => {
      const unsubscribe$ = new Subject<void>();
      const topicDestination = createSubscriptionTopicDestination(topic);
      const observeOutsideAngular = options?.emitOutsideAngularZone ?? false;
      const topicMatcher = new TopicMatcher(topicDestination.getName());

      // Wait until initialized the session so that 'subscriptionExecutor' and 'subscriptionCounter' are initialized.
      this.session
        .then(() => {
          const subscribeError$ = new Subject<never>();
          let subscriptionErrored = false;

          // Filter messages sent to the given topic.
          merge(this._message$, subscribeError$)
            .pipe(
              assertNotInAngularZone(),
              filter(message => topicMatcher.matches(message.getDestination()?.getName())),
              mapToMessageEnvelope(topic),
              observeOutsideAngular ? identity : observeInside(continueFn => this._zone.run(continueFn)),
              takeUntil(merge(this._sessionDisposed$, unsubscribe$)),
              finalize(() => {
                // Unsubscribe from the topic on the Solace session, but only if being the last subscription on that topic and if successfully subscribed to the Solace broker.
                if (this._subscriptionCounter?.decrementAndGet(topicDestination) === 0 && !subscriptionErrored) {
                  this.unsubscribeFromTopic(topicDestination).then(noop);
                }
              }),
            )
            .subscribe(observer);

          // Subscribe to the topic on the Solace session, but only if being the first subscription on that topic.
          if (this._subscriptionCounter!.incrementAndGet(topicDestination) === 1) {
            this.subscribeToTopic(topicDestination, options).then(success => {
              if (success) {
                options?.onSubscribed?.();
              }
              else {
                subscriptionErrored = true;
                subscribeError$.error(`Failed to subscribe to topic ${topicDestination}.`);
              }
            });
          }
          else {
            options?.onSubscribed?.();
          }
        })
        .catch(error => {
          observer.error(error);
        });

      return (): void => unsubscribe$.next();
    });
  }

  /**
   * Subscribes to the given topic on the Solace session.
   */
  private subscribeToTopic(topic: Destination, observeOptions?: ObserveOptions): Promise<boolean> {
    // Calls to `solace.Session.subscribe` and `solace.Session.unsubscribe` must be executed one after the other until the Solace Broker confirms
    // the operation. Otherwise a previous unsubscribe may cancel a later subscribe on the same topic.
    return this._subscriptionExecutor!.scheduleSerial(async () => {
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
            this._logger.warn(`Solace event broker rejected subscription on topic ${topic.getName()}.`, event);
            return false;
          });

        session.subscribe(
          topic,
          true,
          subscribeCorrelationKey,
          observeOptions?.subscribeTimeout,
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
  private unsubscribeFromTopic(topic: Destination): Promise<boolean> {
    // Calls to `solace.Session.subscribe` and `solace.Session.unsubscribe` must be executed one after the other until the Solace Broker confirms
    // the operation. Otherwise a previous unsubscribe may cancel a later subscribe on the same topic.
    return this._subscriptionExecutor!.scheduleSerial(async () => {
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
            this._logger.warn(`Solace event broker rejected unsubscription on topic ${topic.getName()}.`, event);
            return false;
          });

        session.unsubscribe(
          topic,
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

  public consume$(topicOrDescriptor: string | (MessageConsumerProperties & ConsumeOptions)): Observable<MessageEnvelope> {
    if (topicOrDescriptor === undefined) {
      throw Error('Missing required topic or endpoint descriptor.');
    }

    // If passed a `string` literal, subscribe to a non-durable topic endpoint.
    if (typeof topicOrDescriptor === 'string') {
      return this.createMessageConsumer$({
        topicEndpointSubscription: SolclientFactory.createTopicDestination(topicOrDescriptor),
        queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
      });
    }

    return this.createMessageConsumer$(topicOrDescriptor);
  }

  private createMessageConsumer$(consumerProperties: MessageConsumerProperties & ConsumeOptions): Observable<MessageEnvelope> {
    const topicEndpointSubscription = consumerProperties.topicEndpointSubscription?.getName();
    if (topicEndpointSubscription) {
      consumerProperties.topicEndpointSubscription = createSubscriptionTopicDestination(consumerProperties.topicEndpointSubscription!.getName());
    }
    const observeOutsideAngular = consumerProperties?.emitOutsideAngularZone ?? false;

    return new Observable((observer: Observer<Message>): TeardownLogic => {
      let messageConsumer: MessageConsumer | undefined;
      this.session
        .then(session => {
          messageConsumer = session.createMessageConsumer(consumerProperties);

          // Define message consumer event listeners
          messageConsumer.on(MessageConsumerEventName.UP, () => {
            this._logger.debug(`MessageConsumerEvent: UP`);
            consumerProperties?.onSubscribed?.(messageConsumer!);
          });
          messageConsumer.on(MessageConsumerEventName.CONNECT_FAILED_ERROR, (error: OperationError) => {
            this._logger.debug(`MessageConsumerEvent: CONNECT_FAILED_ERROR`, error);
            observer.error(error);
          });
          messageConsumer.on(MessageConsumerEventName.DOWN_ERROR, (error: OperationError) => {
            this._logger.debug(`MessageConsumerEvent: DOWN_ERROR`, error);
            observer.error(error);
          });
          messageConsumer.on(MessageConsumerEventName.DOWN, () => { // event emitted after successful disconnect request
            this._logger.debug(`MessageConsumerEvent: DOWN`);
            messageConsumer?.dispose();
            observer.complete();
          });

          // Define message event listener
          messageConsumer.on(MessageConsumerEventName.MESSAGE, (message: Message) => {
            this._logger.debug(`MessageConsumerEvent: MESSAGE`, message);
            NgZone.assertNotInAngularZone();
            observer.next(message);
          });

          // Connect the message consumer
          messageConsumer.connect();
        })
        .catch(error => {
          observer.error(error);
          messageConsumer?.dispose();
        });

      return (): void => {
        // Initiate an orderly disconnection of the consumer. In turn, we will receive a `MessageConsumerEventName#DOWN` event and dispose the consumer.
        if (messageConsumer && !messageConsumer.disposed) {
          messageConsumer.disconnect();
        }
      };
    })
      .pipe(
        mapToMessageEnvelope(topicEndpointSubscription),
        observeOutsideAngular ? identity : observeInside(continueFn => this._zone.run(continueFn)),
      );
  }

  public browse$(queueOrDescriptor: string | (QueueBrowserProperties & BrowseOptions)): Observable<MessageEnvelope> {
    if (queueOrDescriptor === undefined) {
      throw Error('Missing required queue or descriptor.');
    }

    // If passed a `string` literal, connect to the given queue using default 'browsing' options.
    if (typeof queueOrDescriptor === 'string') {
      return this.createQueueBrowser$({
        queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: queueOrDescriptor}),
      });
    }

    return this.createQueueBrowser$(queueOrDescriptor);
  }

  private createQueueBrowser$(queueBrowserProperties: (QueueBrowserProperties & BrowseOptions)): Observable<MessageEnvelope> {
    const observeOutsideAngular = queueBrowserProperties?.emitOutsideAngularZone ?? false;
    return new Observable((observer: Observer<Message>): TeardownLogic => {
      let queueBrowser: QueueBrowser | undefined;
      let disposed = false;
      this.session
        .then(session => {
          queueBrowser = session.createQueueBrowser(queueBrowserProperties);

          // Define browser event listeners
          queueBrowser.on(QueueBrowserEventName.UP, () => {
            this._logger.debug(`QueueBrowserEvent: UP`);
            queueBrowser!.start();
          });
          queueBrowser.on(QueueBrowserEventName.CONNECT_FAILED_ERROR, (error: OperationError) => {
            this._logger.debug(`QueueBrowserEvent: CONNECT_FAILED_ERROR`, error);
            observer.error(error);
          });
          queueBrowser.on(QueueBrowserEventName.DOWN_ERROR, (error: OperationError) => {
            this._logger.debug(`QueueBrowserEvent: DOWN_ERROR`, error);
            observer.error(error);
          });
          queueBrowser.on(QueueBrowserEventName.DOWN, () => { // event emitted after successful disconnect request
            this._logger.debug(`QueueBrowserEvent: DOWN`);
            observer.complete();
          });
          queueBrowser.on(QueueBrowserEventName.DISPOSED, () => {
            this._logger.debug(`QueueBrowserEvent: DOWN`);
            disposed = true;
            observer.complete();
          });

          // Define browser event listener
          queueBrowser.on(QueueBrowserEventName.MESSAGE, (message: Message) => {
            this._logger.debug(`QueueBrowserEvent: MESSAGE`, message);
            NgZone.assertNotInAngularZone();
            observer.next(message);
          });

          // Connect the browser
          queueBrowser.connect();
        })
        .catch(error => {
          observer.error(error);
        });

      return (): void => {
        // Initiate an orderly disconnection of the browser. In turn, we will receive a `QueueBrowserEventName#DOWN` event and dispose the consumer.
        if (queueBrowser && !disposed) {
          queueBrowser.stop();
          queueBrowser.disconnect();
        }
      };
    })
      .pipe(
        mapToMessageEnvelope(),
        observeOutsideAngular ? identity : observeInside(continueFn => this._zone.run(continueFn)),
      );
  }

  public publish(destination: string | Destination, data?: Data | Message, options?: PublishOptions): Promise<void> {
    const solaceDestination = typeof destination === 'string' ? SolclientFactory.createTopicDestination(destination) : destination;
    const send: Send = (session: Session, message: Message) => session.send(message);
    return this.sendMessage(solaceDestination, data, options, send);
  }

  public request$(destination: string | Destination, data?: Data | Message, options?: RequestOptions): Observable<MessageEnvelope> {
    const observeOutsideAngular = options?.emitOutsideAngularZone ?? false;
    const solaceDestination = typeof destination === 'string' ? SolclientFactory.createTopicDestination(destination) : destination;

    return new Observable<MessageEnvelope>(observer => {
      const unsubscribe$ = new Subject<void>();
      const response$ = new Subject<Message>();
      response$
        .pipe(
          assertNotInAngularZone(),
          mapToMessageEnvelope(),
          observeOutsideAngular ? identity : observeInside(continueFn => this._zone.run(continueFn)),
          takeUntil(unsubscribe$),
        )
        .subscribe(observer);

      const onResponse = (session: Session, message: Message) => {
        response$.next(message);
        response$.complete();
      };
      const onError = (session: Session, error: RequestError) => {
        response$.error(error);
      };

      const send: Send = (session: Session, request: Message) => {
        session.sendRequest(request, options?.requestTimeout, onResponse, onError);
      };
      this.sendMessage(solaceDestination, data, options, send).catch(error => response$.error(error));

      return () => unsubscribe$.next();
    });
  }

  public reply(request: Message, data?: Data | Message, options?: PublishOptions): Promise<void> {
    // "solclientjs" marks the message as 'reply' and copies 'replyTo' destination and 'correlationId' from the request.
    const send: Send = (session: Session, message: Message) => session.sendReply(request, message);
    return this.sendMessage(null, data, options, send);
  }

  private async sendMessage(destination: Destination | null, data: ArrayBufferLike | DataView | string | SDTField | Message | undefined, options: PublishOptions | undefined, send: Send): Promise<void> {
    const message: Message = data instanceof Message ? data : SolclientFactory.createMessage();
    message.setDeliveryMode(message.getDeliveryMode() ?? MessageDeliveryModeType.DIRECT);

    // Set the destination. May not be set if replying to a request.
    if (destination) {
      message.setDestination(destination);
    }

    // Set data, either as unstructured byte data, or as structured container if passed a structured data type (SDT).
    if (data !== undefined && data !== null && !(data instanceof Message)) {
      if (data instanceof SDTField) {
        message.setSdtContainer(data);
      }
      else {
        message.setBinaryAttachment(data);
      }
    }

    // Apply publish options.
    if (options) {
      message.setDeliveryMode(options.deliveryMode ?? message.getDeliveryMode());
      message.setCorrelationId(options.correlationId ?? message.getCorrelationId());
      message.setPriority(options.priority ?? message.getPriority());
      message.setTimeToLive(options.timeToLive ?? message.getTimeToLive());
      message.setDMQEligible(options.dmqEligible ?? message.isDMQEligible());
      message.setCorrelationKey(options.correlationKey ?? message.getCorrelationKey());
      options.replyTo && message.setReplyTo(options.replyTo);
      message.setAsReplyMessage(options.markAsReply ?? message.isReplyMessage());
    }

    // Add headers.
    if (options?.headers?.size) {
      const userPropertyMap = (message.getUserPropertyMap() || new SDTMapContainer());
      options.headers.forEach((value, key) => {
        if (value === undefined || value === null) {
          return;
        }
        if (value instanceof SDTField) {
          const sdtField = value;
          userPropertyMap.addField(key, sdtField.getType(), sdtField.getValue());
        }
        else if (typeof value === 'string') {
          userPropertyMap.addField(key, SDTFieldType.STRING, value);
        }
        else if (typeof value === 'boolean') {
          userPropertyMap.addField(key, SDTFieldType.BOOL, value);
        }
        else if (typeof value === 'number') {
          userPropertyMap.addField(key, SDTFieldType.INT32, value);
        }
        else {
          userPropertyMap.addField(key, SDTFieldType.UNKNOWN, value);
        }
      });
      message.setUserPropertyMap(userPropertyMap);
    }

    // Allow intercepting the message before sending it to the broker.
    options?.intercept?.(message);

    const session = await this.session;

    // Publish the message.
    if (message.getDeliveryMode() === MessageDeliveryModeType.DIRECT) {
      send(session, message);
    }
    else {
      const correlationKey = message.getCorrelationKey() || UUID.randomUUID();
      const whenAcknowledged = this.whenEvent(SessionEventCode.ACKNOWLEDGED_MESSAGE, {rejectOnEvent: SessionEventCode.REJECTED_MESSAGE_ERROR, correlationKey: correlationKey});
      message.setCorrelationKey(correlationKey);
      send(session, message);
      // Resolve the Promise when acknowledged by the broker, or reject it otherwise.
      await whenAcknowledged;
    }
  }

  public get session(): Promise<Session> {
    return this._session || Promise.reject('Not connected to the Solace message broker. Did you forget to initialize the `SolaceClient` via `SolaceMessageClientModule.forRoot({...}) or to invoke \'connect\'`?');
  }

  /**
   * Returns a Promise that resolves to the event when the expected event occurs, or that rejects when the specified `rejectOnEvent` event, if specified, occurs.
   * If a "correlation key" is specified, only events with that correlation key will be evaluated.
   *
   * Note that:
   * - the Promise resolves or rejects outside the Angular zone
   * - the Promise is bound the current session, i.e., will ony be settled as long as the current session is not disposed.
   */
  private whenEvent(resolveOnEvent: SessionEventCode, options?: {rejectOnEvent?: SessionEventCode; correlationKey?: string | object}): Promise<SessionEvent> {
    return new Promise((resolve, reject) => {
      this._event$
        .pipe(
          assertNotInAngularZone(),
          filter(event => !options?.correlationKey || event.correlationKey === options.correlationKey),
          mergeMap(event => {
            switch (event.sessionEventCode) {
              case resolveOnEvent:
                return of(event);
              case options?.rejectOnEvent: {
                return throwError(() => event);
              }
              default:
                return EMPTY;
            }
          }),
          take(1),
        )
        .subscribe({
          next: (event: SessionEvent) => resolve(event),
          error: error => reject(error),
          complete: noop, // do not resolve the Promise when the session is disposed
        });
    });
  }

  private initSolaceClientFactory(): void {
    const factoryProperties = new SolclientFactoryProperties();
    factoryProperties.profile = SolclientFactoryProfiles.version10_5;
    factoryProperties.logLevel = this._logger.logLevel;
    SolclientFactory.init(factoryProperties);
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
    const sessionEventCodeMapping = Object.entries(SessionEventCode).reduce((acc, [key, value]) => acc.set(value as number, key), new Map<number, string>());
    this._event$
      .pipe(
        assertNotInAngularZone(),
        takeUntil(this._destroy$),
      )
      .subscribe((event: SessionEvent) => {
        this._logger.debug(`SessionEvent: ${sessionEventCodeMapping.get(event.sessionEventCode)}`, event);
      });
  }

  private monitorConnectionState$(): Observable<boolean> {
    const connected$ = this._event$
      .pipe(
        assertNotInAngularZone(),
        map(event => event.sessionEventCode),
        filter(event => CONNECTION_ESTABLISHED_EVENTS.has(event) || CONNECTION_LOST_EVENTS.has(event)),
        map(event => CONNECTION_ESTABLISHED_EVENTS.has(event)),
        distinctUntilChanged(),
        observeInside(continueFn => this._zone.run(continueFn)),
        share({
          connector: () => new ReplaySubject<boolean>(1),
          resetOnRefCountZero: false,
          resetOnError: false,
          resetOnComplete: false,
        }),
      );
    // Connect to the source, then unsubscribe immediately (resetOnRefCountZero: false)
    connected$.subscribe().unsubscribe();
    return connected$;
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
    this.dispose();
  }
}

/**
 * Maps each {@link Message} to a {@link MessageEnvelope}, and resolves substituted named wildcard segments.
 */
function mapToMessageEnvelope(subscriptionTopic?: string): OperatorFunction<Message, MessageEnvelope> {
  return map((message: Message): MessageEnvelope => {
    return {
      message,
      params: collectNamedTopicSegmentValues(message, subscriptionTopic),
      headers: collectHeaders(message),
    };
  });
}

/**
 * Collects message headers from given message.
 */
function collectHeaders(message: Message): Map<string, any> {
  const userPropertyMap = message.getUserPropertyMap();
  return userPropertyMap?.getKeys().reduce((acc, key) => {
    return acc.set(key, userPropertyMap.getField(key)!.getValue());
  }, new Map()) || new Map();
}

/**
 * Parses the effective message destination for named path segments, if any.
 */
function collectNamedTopicSegmentValues(message: Message, subscriptionTopic: string | undefined): Map<string, string> {
  if (subscriptionTopic === undefined || !subscriptionTopic.length) {
    return new Map<string, string>();
  }

  const subscriptionSegments = subscriptionTopic.split('/');
  const effectiveDestinationSegments = message.getDestination()!.getName().split('/');
  return subscriptionSegments.reduce((acc, subscriptionSegment, i) => {
    if (isNamedWildcardSegment(subscriptionSegment)) {
      return acc.set(subscriptionSegment.substring(1), effectiveDestinationSegments[i]);
    }
    return acc;
  }, new Map<string, string>());
}

/**
 * Tests whether given segment is a named path segment, i.e., a segment that acts as placeholer for any value, equivalent to the Solace single-level wildcard character (`*`).
 */
function isNamedWildcardSegment(segment: string): boolean {
  return segment.startsWith(':') && segment.length > 1;
}

/**
 * Creates a Solace subscription topic with named topic segments replaced by single-level wildcard characters (`*`), if any.
 */
function createSubscriptionTopicDestination(topic: string): Destination {
  const subscriptionTopic = topic.split('/')
    .map(segment => isNamedWildcardSegment(segment) ? '*' : segment)
    .join('/');
  return SolclientFactory.createTopicDestination(subscriptionTopic);
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

/**
 * Implements a strategy for sending a message.
 */
type Send = (session: Session, message: Message) => void;

function obfuscateSecrets(sessionProperties: SolaceMessageClientConfig): SolaceMessageClientConfig {
  const obfuscated = {...sessionProperties};
  if (obfuscated.password) {
    obfuscated.password = '***';
  }
  if (obfuscated.accessToken) {
    obfuscated.accessToken = '***';
  }
  return obfuscated;
}

/**
 * Maps RxJS {@link EmptyError} to the given error. Other errors are re-thrown unchanged.
 */
function mapEmptyError(errorFactory: () => Error): (error: any) => Promise<never> {
  return (error: any): any => {
    if (error instanceof EmptyError) {
      return Promise.reject(errorFactory());
    }
    else {
      return Promise.reject(error);
    }
  };
}
