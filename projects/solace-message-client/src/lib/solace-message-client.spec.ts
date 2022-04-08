import {SolaceMessageClientModule} from './solace-message-client.module';
import {mapToBinary, mapToText, MessageEnvelope, Params, PublishOptions, SolaceMessageClient} from './solace-message-client';
import {SolaceSessionProvider} from './solace-session-provider';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {Destination, DestinationType, Message, MessageConsumer, MessageConsumerEvent, MessageConsumerEventName, MessageConsumerProperties, MessageDeliveryModeType, MessageType, OperationError, QueueBrowser, QueueBrowserEventName, QueueBrowserProperties, QueueDescriptor, QueueType, SDTField, SDTFieldType, SDTMapContainer, Session, SessionEvent, SessionEventCode, SolclientFactory, SolclientFactoryProfiles, SolclientFactoryProperties} from 'solclientjs';
import {asyncScheduler, noop} from 'rxjs';
import {UUID} from '@scion/toolkit/uuid';
import './solclientjs-typedef-augmentation';

type SessionEventListener = (() => void) | ((event: SessionEvent) => void) | ((error: OperationError) => void) | ((message: Message) => void);
type MessageConsumerEventListener = (() => void) | ((event: MessageConsumerEvent) => void) | ((error: OperationError) => void) | ((message: Message) => void);
type QueueBrowserEventListener = (() => void) | ((error: OperationError) => void) | ((message: Message) => void);

describe('SolaceMessageClient', () => {

  let session: jasmine.SpyObj<Session>;
  let sessionProvider: jasmine.SpyObj<SolaceSessionProvider>;
  let sessionEventCallbacks: Map<SessionEventCode, SessionEventListener>;

  beforeEach(() => {
    const factoryProperties = new SolclientFactoryProperties();
    factoryProperties.profile = SolclientFactoryProfiles.version10;
    SolclientFactory.init(factoryProperties);

    // Mock Solace Session and provide it via `SolaceSessionProvider`
    session = jasmine.createSpyObj('sessionClient', ['on', 'connect', 'subscribe', 'unsubscribe', 'send', 'dispose', 'disconnect', 'createMessageConsumer', 'createQueueBrowser']);
    sessionProvider = jasmine.createSpyObj('SolaceSessionProvider', ['provide']);
    sessionProvider.provide.and.returnValue(session);

    // Capture session lifecycle hooks
    sessionEventCallbacks = new Map();
    session.on.and.callFake((eventCode: SessionEventCode, callback: (event: any) => void): Session => {
      sessionEventCallbacks.set(eventCode, callback);
      return session;
    });

    // Fire 'DISCONNECTED' event when invoking 'disconnect'.
    session.disconnect.and.callFake(() => simulateLifecycleEvent(SessionEventCode.DISCONNECTED));
  });

  describe('initialize library with broker config: SolaceMessageClientModule.forRoot({...})', () => {

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {provide: SolaceSessionProvider, useValue: sessionProvider},
        ],
        imports: [
          SolaceMessageClientModule.forRoot({url: 'url:forRoot', vpnName: 'vpn:forRoot'}),
        ],
      });
    });

    it('should connect to the Solace message broker when injecting `SolaceMessageClient`', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledTimes(1);
      await expectAsync(solaceMessageClient.session).toBeResolved();
    });

    it('should allow to disconnect and re-connect from the Solace message broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      expect(session.connect).toHaveBeenCalledTimes(1);
      session.connect.calls.reset();
      sessionProvider.provide.calls.reset();

      // Disconnect
      await solaceMessageClient.disconnect();
      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
      session.dispose.calls.reset();
      session.disconnect.calls.reset();

      // Connect
      const connected = solaceMessageClient.connect({url: 'some-other-url', vpnName: 'some-other-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      await expectAsync(solaceMessageClient.session).toBeResolved();

      await connected;
      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-other-url', vpnName: 'some-other-vpn'}));
    });

    it('should connect with the config as provided in \'SolaceMessageClientModule.forRoot({...})\'', async () => {
      TestBed.inject(SolaceMessageClient);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url:forRoot', vpnName: 'vpn:forRoot'}));
    });

    describe('core functionality', () => {

      beforeEach(async () => {
        // 1. Construct `SolaceMessageClient` via DI; the connection to the broker is automatically established by passing connect properties to `SolaceMessageClientModule.forRoot`.
        TestBed.inject(SolaceMessageClient);
        // 2. Simulate connected to the broker by receiving a 'UP_NOTICE' confirmation from the broker
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      });

      testCoreFunctionality();
    });
  });

  describe('initialize library without broker config: SolaceMessageClientModule.forRoot()', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          {provide: SolaceSessionProvider, useValue: sessionProvider},
        ],
        imports: [
          SolaceMessageClientModule.forRoot(),
        ],
      });
    });

    it('should not connect to the Solace message broker when injecting `SolaceMessageClient`', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await expectAsync(solaceMessageClient.session).toBeRejected();
      expect(session.connect).toHaveBeenCalledTimes(0);
      expect(sessionProvider.provide).toHaveBeenCalledTimes(0);
    });

    it('should allow to connect and disconnect from the Solace message broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Connect
      expectAsync(solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'})).toBeResolved();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      await expectAsync(solaceMessageClient.session).toBeResolved();

      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-url', vpnName: 'some-vpn'}));
      session.connect.calls.reset();
      sessionProvider.provide.calls.reset();

      // Disconnect
      await solaceMessageClient.disconnect();
      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
      session.dispose.calls.reset();
      session.disconnect.calls.reset();

      // Connect
      expectAsync(solaceMessageClient.connect({url: 'some-other-url', vpnName: 'some-other-vpn'})).toBeResolved();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      await expectAsync(solaceMessageClient.session).toBeResolved();

      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-other-url', vpnName: 'some-other-vpn'}));
    });

    it('should reject the connect Promise when the connect attempt fails', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      expectAsync(solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'})).toBeRejected();
      await simulateLifecycleEvent(SessionEventCode.CONNECT_FAILED_ERROR, undefined);
      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-url', vpnName: 'some-vpn'}));
    });

    describe('core functionality', () => {

      beforeEach(async () => {
        // 1. Construct `SolaceMessageClient` via DI and connect to the broker
        TestBed.inject(SolaceMessageClient).connect({url: 'some-url', vpnName: 'some-vpn'});
        // 2. Simulate connected to the broker by receiving a 'UP_NOTICE' confirmation from the broker
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      });

      testCoreFunctionality();
    });
  });

  /**
   * Tests functionality which is independent of the way of connecting to the message broker.
   */
  function testCoreFunctionality(): void {
    it('should clear pending subscriptions when the connection goes down', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic-1 (success)
      solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Subscribe to topic-2 (pending confirmation)
      solaceMessageClient.observe$('topic-2').subscribe();
      await drainMicrotaskQueue();

      // Simulate the connection to be permanently down
      await simulateLifecycleEvent(SessionEventCode.DOWN_ERROR);

      // Reconnect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      session.subscribe.calls.reset();

      // Subscribe to topic-3 (success)
      solaceMessageClient.observe$('topic-3').subscribe();
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    });

    it('should create a single subscription per topic on the Solace session', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to topic-1
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const subscription1 = solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe again to topic-1
      const subscription2 = solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe again to topic-1
      const subscription3 = solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe to topic-2
      const subscription4 = solaceMessageClient.observe$('topic-2').subscribe();
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Unsubscribe from topic-1 (subscription 1)
      subscription1.unsubscribe();
      await drainMicrotaskQueue();
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);

      // Unsubscribe from topic-1 (subscription 3)
      subscription3.unsubscribe();
      await drainMicrotaskQueue();
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);

      // Unsubscribe from topic-1 (subscription 2)
      subscription2.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      session.unsubscribe.calls.reset();
      sessionUnsubscribeCaptor.reset();

      // Unsubscribe from topic-2 (subscription 4)
      subscription4.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    });

    it('should error when failing to subscribe to a topic on the Solace session', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const observeCaptor = new ObserveCaptor();
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const subscription = solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

      // Simulate the subscription to fail
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);

      // Expect the Observable to error
      expect(observeCaptor.hasErrored()).toEqual(true);
      expect(observeCaptor.hasCompleted()).toEqual(false);
      expect(subscription.closed).toEqual(true);

      // Expect that SolaceMessageClient did not invoke unsubscribe
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
    });

    it('should subscribe to a topic on the Solace session even if a previous subscription for the same topic failed', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to a topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const observeCaptor = new ObserveCaptor();
      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

      // Simulate the subscription to error
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasErrored()).toBeTrue();

      // Reset mock invocations
      sessionSubscribeCaptor.reset();
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // Subscribe to the topic anew
      const subscription = solaceMessageClient.observe$('topic').subscribe();
      await drainMicrotaskQueue();

      // Expect the SolaceMessageClient to invoke subscribe on the Solace session for that topic
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

      // Simulate the subscription to succeed
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      session.unsubscribe.calls.reset();

      // Unsubscribe from the topic
      subscription.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    });

    it('should not unsubscribe more specific topics when unsubscribing from a wildcard topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();

      // Subscribe to topic 'myhome/*/temperature'
      const observeCaptor1 = new ObserveCaptor(extractMessage);
      const wildcardSubscription = solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Subscribe to topic 'myhome/livingroom/kitchen'
      const observeCaptor2 = new ObserveCaptor(extractMessage);
      const exactSubscription = solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(observeCaptor2);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/kitchen'
      const message1 = createTopicMessage('myhome/livingroom/temperature');
      await simulateTopicMessage(message1);
      expect(observeCaptor1.getValues()).toEqual([message1]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message1]); // topic: myhome/livingroom/temperature

      observeCaptor1.reset();
      observeCaptor2.reset();

      // Unsubscribe wildcard subscription
      wildcardSubscription.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/*/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      sessionUnsubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/temperature'
      const message2 = createTopicMessage('myhome/livingroom/temperature');
      await simulateTopicMessage(message2);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message2]); // topic: myhome/livingroom/temperature

      observeCaptor1.reset();
      observeCaptor2.reset();
      session.unsubscribe.calls.reset();

      // Unsubscribe exact subscription
      exactSubscription.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/livingroom/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/temperature'
      const message3 = createTopicMessage('myhome/livingroom/temperature');
      await simulateTopicMessage(message3);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([]); // topic: myhome/livingroom/temperature
    });

    it('should receive messages sent to a topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to topic-1
      const observeCaptor1_topic1 = new ObserveCaptor(extractMessage);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();

      const subscription1_topic1 = solaceMessageClient.observe$('topic-1').subscribe(observeCaptor1_topic1);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message1 = createTopicMessage('topic-1');
      await simulateTopicMessage(message1);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1]);

      // Simulate receiving a message from the Solace broker
      const message2 = createTopicMessage('topic-1');
      await simulateTopicMessage(message2);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

      // Simulate receiving a message from the Solace broker
      const message3 = createTopicMessage('topic-2');
      await simulateTopicMessage(message3);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

      // Subscribe to topic-2
      const observeCaptor2_topic2 = new ObserveCaptor(extractMessage);
      const subscription2_topic2 = solaceMessageClient.observe$('topic-2').subscribe(observeCaptor2_topic2);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message4 = createTopicMessage('topic-1');
      await simulateTopicMessage(message4);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
      expect(observeCaptor2_topic2.getValues()).toEqual([]);

      // Simulate receiving a message from the Solace broker
      const message5 = createTopicMessage('topic-2');
      simulateTopicMessage(message5);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5]);

      // Simulate receiving a message from the Solace broker
      const message6 = createTopicMessage('topic-3');
      simulateTopicMessage(message6);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5]);

      // Subscribe to topic-2 anew
      const observeCaptor3_topic2 = new ObserveCaptor(extractMessage);
      const subscription3_topic2 = solaceMessageClient.observe$('topic-2').subscribe(observeCaptor3_topic2);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message7 = createTopicMessage('topic-1');
      simulateTopicMessage(message7);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5]);
      expect(observeCaptor3_topic2.getValues()).toEqual([]);

      // Simulate receiving a message from the Solace broker
      const message8 = createTopicMessage('topic-2');
      simulateTopicMessage(message8);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message9 = createTopicMessage('topic-3');
      simulateTopicMessage(message9);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Unsubscribe subscription 3 (topic-2)
      subscription3_topic2.unsubscribe();
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message10 = createTopicMessage('topic-1');
      simulateTopicMessage(message10);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message11 = createTopicMessage('topic-2');
      simulateTopicMessage(message11);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message12 = createTopicMessage('topic-3');
      simulateTopicMessage(message12);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Unsubscribe subscription 1 (topic-1)
      subscription1_topic1.unsubscribe();
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message13 = createTopicMessage('topic-1');
      simulateTopicMessage(message13);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message14 = createTopicMessage('topic-2');
      simulateTopicMessage(message14);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message15 = createTopicMessage('topic-3');
      simulateTopicMessage(message15);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Unsubscribe subscription 2 (topic-2)
      subscription2_topic2.unsubscribe();
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message16 = createTopicMessage('topic-1');
      simulateTopicMessage(message16);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message17 = createTopicMessage('topic-2');
      simulateTopicMessage(message17);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

      // Simulate receiving a message from the Solace broker
      const message18 = createTopicMessage('topic-3');
      simulateTopicMessage(message18);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
      expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
      expect(observeCaptor3_topic2.getValues()).toEqual([message8]);
    });

    it('should receive messages inside the Angular zone (by default)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

      // Subscribe to topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      await simulateTopicMessage(createTopicMessage('topic'));

      // Expect message to be received inside the Angular zone
      expect(observeCaptor.getValues()).toEqual([true]);
    });

    it('should receive messages outside the Angular zone', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

      // Subscribe to topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      solaceMessageClient.observe$('topic', {emitOutsideAngularZone: true}).subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      await simulateTopicMessage(createTopicMessage('topic'));

      // Expect message to be received outside the Angular zone
      expect(observeCaptor.getValues()).toEqual([false]);
    });

    it('should allow wildcard subscriptions', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      const observeCaptor1 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor2 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/*/*').subscribe(observeCaptor2);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor3 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/>').subscribe(observeCaptor3);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor4 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/kitchen/*').subscribe(observeCaptor4);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor5 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/kitchen/temperature/>').subscribe(observeCaptor5);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor6 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/floor4/kitchen/temperature/celsius').subscribe(observeCaptor6);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Simulate receiving a message from the Solace broker
      let message = createTopicMessage('myhome/livingroom/temperature');
      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([message]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message]); // topic: myhome/*/*
      expect(observeCaptor3.getValues()).toEqual([message]); // topic: myhome/>
      expect(observeCaptor4.getValues()).toEqual([]); // topic: myhome/kitchen/*
      expect(observeCaptor5.getValues()).toEqual([]); // topic: myhome/kitchen/temperature/>
      expect(observeCaptor6.getValues()).toEqual([]); // topic: myhome/floor4/kitchen/temperature/celsius

      observeCaptor1.reset();
      observeCaptor2.reset();
      observeCaptor3.reset();
      observeCaptor4.reset();
      observeCaptor5.reset();
      observeCaptor6.reset();

      // Simulate receiving a message from the Solace broker
      message = createTopicMessage('myhome/kitchen/temperature');
      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([message]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message]); // topic: myhome/*/*
      expect(observeCaptor3.getValues()).toEqual([message]); // topic: myhome/>
      expect(observeCaptor4.getValues()).toEqual([message]); // topic: myhome/kitchen/*
      expect(observeCaptor5.getValues()).toEqual([]); // topic: myhome/kitchen/temperature/>
      expect(observeCaptor6.getValues()).toEqual([]); // topic: myhome/floor4/kitchen/temperature/celsius

      observeCaptor1.reset();
      observeCaptor2.reset();
      observeCaptor3.reset();
      observeCaptor4.reset();
      observeCaptor5.reset();
      observeCaptor6.reset();

      // Simulate receiving a message from the Solace broker
      message = createTopicMessage('myhome/kitchen/humidity');
      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message]); // topic: myhome/*/*
      expect(observeCaptor3.getValues()).toEqual([message]); // topic: myhome/>
      expect(observeCaptor4.getValues()).toEqual([message]); // topic: myhome/kitchen/*
      expect(observeCaptor5.getValues()).toEqual([]); // topic: myhome/kitchen/temperature/>
      expect(observeCaptor6.getValues()).toEqual([]); // topic: myhome/floor4/kitchen/temperature/celsius

      observeCaptor1.reset();
      observeCaptor2.reset();
      observeCaptor3.reset();
      observeCaptor4.reset();
      observeCaptor5.reset();
      observeCaptor6.reset();

      // Simulate receiving a message from the Solace broker
      message = createTopicMessage('myhome/floor4/kitchen/temperature');
      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([]); // topic: myhome/*/*
      expect(observeCaptor3.getValues()).toEqual([message]); // topic: myhome/>
      expect(observeCaptor4.getValues()).toEqual([]); // topic: myhome/kitchen/*
      expect(observeCaptor5.getValues()).toEqual([]); // topic: myhome/kitchen/temperature/>
      expect(observeCaptor6.getValues()).toEqual([]); // topic: myhome/floor4/kitchen/temperature/celsius

      observeCaptor1.reset();
      observeCaptor2.reset();
      observeCaptor3.reset();
      observeCaptor4.reset();
      observeCaptor5.reset();
      observeCaptor6.reset();
    });

    it('should provide substituted values of named wildcard segments', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      const observeCaptor1 = new ObserveCaptor<MessageEnvelope>();
      solaceMessageClient.observe$('myhome/:room/temperature').subscribe(observeCaptor1);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      const observeCaptor2 = new ObserveCaptor<MessageEnvelope>();
      solaceMessageClient.observe$('myhome/:room/:measurement').subscribe(observeCaptor2);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      const observeCaptor3 = new ObserveCaptor<[string, Params, Message]>();
      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor3);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message = createTopicMessage('myhome/livingroom/temperature');
      message.setSdtContainer(SDTField.create(SDTFieldType.STRING, '20°C'));

      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom')})]);
      expect(observeCaptor2.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom').set('measurement', 'temperature')})]);
      expect(observeCaptor3.getValues()).toEqual([['20°C', new Map().set('room', 'livingroom'), message]]);
    });

    it('should notify when subscribed to topic destination', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic
      const onSubscribedCallback1 = jasmine.createSpy('onSubscribed');
      solaceMessageClient.observe$('topic', {onSubscribed: onSubscribedCallback1}).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribed` callback to be invoked after the receipt of `SUBSCRIPTION_OK` event
      expect(onSubscribedCallback1).toHaveBeenCalledTimes(0);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(onSubscribedCallback1).toHaveBeenCalledTimes(1);
      expect(onSubscribedCallback1).toHaveBeenCalledWith();
      sessionSubscribeCaptor.reset();

      // Subscribe to topic anew
      const onSubscribedCallback2 = jasmine.createSpy('onSubscribed');
      solaceMessageClient.observe$('topic', {onSubscribed: onSubscribedCallback2}).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribed` callback to be invoked immediately
      expect(onSubscribedCallback2).toHaveBeenCalledTimes(1);
      expect(onSubscribedCallback2).toHaveBeenCalledWith();
    });

    it('should not notify when subscription to topic destination failed', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic
      const onSubscribedCallback = jasmine.createSpy('onSubscribed');
      solaceMessageClient.observe$('topic', {onSubscribed: onSubscribedCallback}).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribed` callback not to be invoked after the receipt of `SUBSCRIPTION_ERROR` event
      expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
    });

    it('should publish a message to a topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message to a topic
      await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.destination!.getType()).toEqual(DestinationType.TOPIC);
    });

    it('should publish a message to a queue', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message to a queue
      await expectAsync(solaceMessageClient.enqueue('queue', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('queue');
      expect(sessionSendCaptor.destination!.getType()).toEqual(DestinationType.QUEUE);
    });

    it('should publish a message as binary message (by default)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message!.getBinaryAttachment()).toEqual('payload');
    });

    it('should allow publishing a message as structured text message (SDT Structured Data Type)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', SDTField.create(SDTFieldType.STRING, 'payload'))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.TEXT);
      expect(sessionSendCaptor.message!.getSdtContainer()!.getValue()).toEqual('payload');
    });

    it('should allow publishing a message as structured map message (SDT Structured Data Type)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      const mapContainer = new SDTMapContainer();
      mapContainer.addField('key', SDTFieldType.STRING, 'value');
      await expectAsync(solaceMessageClient.publish('topic', SDTField.create(SDTFieldType.MAP, mapContainer))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.MAP);
      expect(sessionSendCaptor.message!.getSdtContainer()!.getValue()).toEqual(mapContainer);
    });

    it('should allow publishing a message as given', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      const message = SolclientFactory.createMessage();
      message.setCorrelationId('123');
      await expectAsync(solaceMessageClient.publish('topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
      expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
    });

    it('should ignore the topic set on the message', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      const message = SolclientFactory.createMessage();
      message.setDestination(SolclientFactory.createTopicDestination('message-topic'));
      await expectAsync(solaceMessageClient.publish('publish-topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('publish-topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
    });

    it('should allow intercepting the message before sent over the network', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload', {
        intercept: msg => {
          msg.setPriority(123);
        },
      })).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
    });

    it('should publish a message as direct message (by default)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic')).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
    });

    it('should allow controlling publishing of the message by passing options', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();

      const publishOptions: PublishOptions = {
        dmqEligible: true,
        correlationId: '123',
        priority: 123,
        timeToLive: 123,
      };

      // publish binary message
      await expectAsync(solaceMessageClient.publish('topic', 'blubber', publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
      expect(sessionSendCaptor.message!.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message!.getTimeToLive()).toEqual(123);

      // publish a Solace message
      session.send.calls.reset();
      await expectAsync(solaceMessageClient.publish('topic', SolclientFactory.createMessage(), publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
      expect(sessionSendCaptor.message!.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message!.getTimeToLive()).toEqual(123);
    });

    it('should map a structured text message into its textual representation', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();
      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving message published to 'myhome/kitchen/temperature'
      const message = createTopicMessage('myhome/kitchen/temperature');
      message.setSdtContainer(SDTField.create(SDTFieldType.STRING, 'textual-payload'));
      simulateTopicMessage(message);

      await observeCaptor.waitUntilEmitCount(1);
      expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['textual-payload', new Map().set('room', 'kitchen'), message]]);
    });

    it('should map a binary message into its binary representation', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();

      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToBinary<string>()).subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving message published to 'myhome/kitchen/temperature'
      const message = createTopicMessage('myhome/kitchen/temperature');
      message.setBinaryAttachment('binary');
      simulateTopicMessage(message);

      expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['binary', new Map().set('room', 'kitchen'), message]]);
    });

    it('should complete subscription Observables when disconnecting from the broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to a topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor();

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      await solaceMessageClient.disconnect();
      expect(observeCaptor.hasCompleted()).toBeTrue();
    });

    it('should destroy the Solace session when disconnecting from the broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      await solaceMessageClient.disconnect();

      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should clear Solace subscription registry when disconnecting from the broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to 'topic'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Disconnect
      await solaceMessageClient.disconnect();

      // Connect
      const connected = solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);
      await connected;

      // Subscribe again to 'topic', but after a re-connect, expecting a new subscription to be created
      solaceMessageClient.observe$('topic').subscribe();
      await drainMicrotaskQueue();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    });

    it('should not cancel Solace subscriptions but complete Observables when the Solace session died (e.g. network interruption, with the max reconnect count exceeded)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      // Simulate the connection to be permanently down
      await simulateLifecycleEvent(SessionEventCode.DOWN_ERROR);

      expect(session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
      expect(session.dispose).toHaveBeenCalledTimes(1);

      // Assert that we do not unsubscribe from the session upon a session down event. Otherwise, solclientjs would enter an invalid state and crash.
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeTrue();
    });

    it('should not cancel Solace subscriptions nor complete Observables in case of a connection lost while the retry mechanism is in progress', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      // Simulate connection interruption
      await simulateLifecycleEvent(SessionEventCode.RECONNECTING_NOTICE);
      session.subscribe.calls.reset();

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();

      // Simulate connection reconnected
      await simulateLifecycleEvent(SessionEventCode.RECONNECTED_NOTICE);

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();
    });

    it('should not cancel Solace subscriptions but complete Observables when exceeding the maximal retry count limit upon a connection lost', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      // Simulate connection interruption
      await simulateLifecycleEvent(SessionEventCode.RECONNECTING_NOTICE);
      session.subscribe.calls.reset();

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();

      // Simulate maximal retry count limit exceeded
      await simulateLifecycleEvent(SessionEventCode.DOWN_ERROR);

      expect(session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeTrue();
    });

    it(`should dispose the Solace session but not invoke 'solace.session.disconnect()' when the connection goes irreparably down`, async () => {
      // Simulate the connection goes irreparably down
      await simulateLifecycleEvent(SessionEventCode.DOWN_ERROR);

      expect(session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });

    it(`should invoke 'solace.session.dispose()' but not 'solace.session.disconnect()' when receiving DISCONNECT confirmation event`, async () => {
      // Simulate the session to be disconnected
      await simulateLifecycleEvent(SessionEventCode.DISCONNECTED);

      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });

    it(`should invoke 'solace.session.dispose()' only when received DISCONNECT confirmation event from the broker`, async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      // Disable the opinionated test behavior that when `session.disconnect` is called, an automatic `SessionEventCode.DISCONNECTED` event is fired.
      session.disconnect.and.callFake(noop);

      // Disconnect
      let resolved = false;
      const whenDisconnected = solaceMessageClient.disconnect().then(() => resolved = true);
      await drainMicrotaskQueue();

      expect(session.disconnect).toHaveBeenCalledTimes(1);
      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(resolved).toBeFalse();

      // Simulate the session to be disconnected
      await simulateLifecycleEvent(SessionEventCode.DISCONNECTED);
      await expectAsync(whenDisconnected).toBeResolved();
      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(resolved).toBeTrue();
    });

    it('should subscribe sequentially', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // subscribe to `topic 1`
      solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();

      // subscribe to `topic 2`
      solaceMessageClient.observe$('topic-2').subscribe();
      await drainMicrotaskQueue();

      // subscribe to `topic 3`
      const topic3SubscribeCaptor = new ObserveCaptor();
      solaceMessageClient.observe$('topic-3').subscribe(topic3SubscribeCaptor);
      await drainMicrotaskQueue();

      // subscribe to `topic 4`
      solaceMessageClient.observe$('topic-4').subscribe();
      await drainMicrotaskQueue();

      // expect single call to `session.subscribe` for subscription of `topic-1`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-1`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-2`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-2`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-3`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
      session.subscribe.calls.reset();

      // simulate error confirmation of subscription for topic `topic-3`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(topic3SubscribeCaptor.hasErrored()).toBeTrue();

      // expect single call to `session.subscribe` for subscription of `topic-4`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-4'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
      session.subscribe.calls.reset();
      await drainMicrotaskQueue();
    });

    it('should subscribe and unsubscribe sequentially on the same topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();

      // subscribe to `topic`
      const subscription1 = solaceMessageClient.observe$('topic').subscribe();
      await drainMicrotaskQueue();

      // unsubscribe from `topic` (Solace confirmation is pending)
      subscription1.unsubscribe();
      await drainMicrotaskQueue();

      // subscribe to `topic` (Solace confirmations are pending)
      const subscription2 = solaceMessageClient.observe$('topic').subscribe();
      await drainMicrotaskQueue();

      // unsubscribe from `topic` (Solace confirmations are pending)
      subscription2.unsubscribe();
      await drainMicrotaskQueue();

      // expect single call to `session.subscribe` (subscription 1)
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 1
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 1)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of unsubscription 1
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 2
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();
    });

    describe('Guraranteed messaging', () => {
      it('should resolve the "Publish Promise" when the broker acknowledges the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        const correlationKey = UUID.randomUUID();
        let resolved = false;
        const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.PERSISTENT, correlationKey}).then(() => resolved = true);
        await drainMicrotaskQueue();
        expect(resolved).toBeFalse();

        await simulateLifecycleEvent(SessionEventCode.ACKNOWLEDGED_MESSAGE, correlationKey);
        expect(resolved).toBeTrue();
        await expectAsync(whenPublished).toBeResolved();
      });

      it('should reject the "Publish Promise" when the broker rejects the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        const correlationKey = UUID.randomUUID();
        let resolved = false;
        const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.PERSISTENT, correlationKey}).then(() => resolved = true);
        await drainMicrotaskQueue();
        expect(resolved).toBeFalse();

        await simulateLifecycleEvent(SessionEventCode.REJECTED_MESSAGE_ERROR, correlationKey);
        expect(resolved).toBeFalse();
        await expectAsync(whenPublished).toBeRejected();
      });
    });

    describe('Direct messaging', () => {
      it('should resolve the "Publish Promise" immediately', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.DIRECT});
        await drainMicrotaskQueue();
        await expectAsync(whenPublished).toBeResolved();
      });
    });

    describe('headers', () => {

      it('should publish message headers (user properties)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const sessionSendCaptor = installSessionSendCaptor();

        // publish the message
        const headers = new Map()
          .set('key1', 'value')
          .set('key2', true)
          .set('key3', false)
          .set('key4', 123)
          .set('key5', 0)
          .set('key6', SDTField.create(SDTFieldType.INT16, 16))
          .set('key7', SDTField.create(SDTFieldType.INT32, 32))
          .set('key8', SDTField.create(SDTFieldType.INT64, 64))
          .set('key9', SDTField.create(SDTFieldType.UNKNOWN, '!UNKNOWN!'))
          .set('key10', undefined)
          .set('key11', null);

        await expectAsync(solaceMessageClient.publish('topic', 'payload', {headers})).toBeResolved();

        const userPropertyMap = sessionSendCaptor.message!.getUserPropertyMap()!;
        expect(userPropertyMap.getKeys()).toEqual(['key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7', 'key8', 'key9']);

        expect(userPropertyMap.getField('key1')!.getType()).toEqual(SDTFieldType.STRING);
        expect(userPropertyMap.getField('key1')!.getValue()).toEqual('value');

        expect(userPropertyMap.getField('key2')!.getType()).toEqual(SDTFieldType.BOOL);
        expect(userPropertyMap.getField('key2')!.getValue()).toEqual(true);

        expect(userPropertyMap.getField('key3')!.getType()).toEqual(SDTFieldType.BOOL);
        expect(userPropertyMap.getField('key3')!.getValue()).toEqual(false);

        expect(userPropertyMap.getField('key4')!.getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key4')!.getValue()).toEqual(123);

        expect(userPropertyMap.getField('key5')!.getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key5')!.getValue()).toEqual(0);

        expect(userPropertyMap.getField('key6')!.getType()).toEqual(SDTFieldType.INT16);
        expect(userPropertyMap.getField('key6')!.getValue()).toEqual(16);

        expect(userPropertyMap.getField('key7')!.getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key7')!.getValue()).toEqual(32);

        expect(userPropertyMap.getField('key8')!.getType()).toEqual(SDTFieldType.INT64);
        expect(userPropertyMap.getField('key8')!.getValue()).toEqual(64);

        expect(userPropertyMap.getField('key9')!.getType()).toEqual(SDTFieldType.UNKNOWN);
        expect(userPropertyMap.getField('key9')!.getValue()).toEqual('!UNKNOWN!');
      });

      it('should receive message headers (user properties)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to topic 'topic'
        const sessionSubscribeCaptor = installSessionSubscribeCaptor();
        const observeCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.observe$('topic').subscribe(observeCaptor);
        await drainMicrotaskQueue();
        await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

        // Simulate receiving message published to 'topic'
        const message = createTopicMessage('topic');
        const userPropertyMap = new SDTMapContainer();
        userPropertyMap.addField('key1', SDTFieldType.STRING, 'value');
        userPropertyMap.addField('key2', SDTFieldType.BOOL, true);
        userPropertyMap.addField('key3', SDTFieldType.BOOL, false);
        userPropertyMap.addField('key4', SDTFieldType.INT16, 16);
        userPropertyMap.addField('key5', SDTFieldType.INT32, 32);
        userPropertyMap.addField('key6', SDTFieldType.INT64, 64);
        userPropertyMap.addField('key7', SDTFieldType.UNKNOWN, '!UNKNOWN!');
        message.setUserPropertyMap(userPropertyMap);

        simulateTopicMessage(message);

        await observeCaptor.waitUntilEmitCount(1);
        expect(observeCaptor.getLastValue().headers).toEqual(new Map()
          .set('key1', 'value')
          .set('key2', true)
          .set('key3', false)
          .set('key4', 16)
          .set('key5', 32)
          .set('key6', 64)
          .set('key7', '!UNKNOWN!'));
      });
    });

    describe('SolaceMessageClient#consume$', () => {
      it('should connect to a non-durable topic endpoint if passing a topic \'string\' literal', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a non-durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        solaceMessageClient.consume$('topic').subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Expect connected to a non-durable topic endpoint
        expect(messageConsumerMock.messageConsumerProperties).toEqual({
          topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
          // @ts-expect-error: typedef(solclientjs): remove '@ts-expect-error' when changed 'queueDescriptor' to accept an object literal with 'name' as optional field
          // see 'solclient-fulljs' line 4301 that 'solclientjs' already supports the 'queueDescriptor' to be an object literal with 'name' as optional field. */
          queueDescriptor: {type: QueueType.TOPIC_ENDPOINT, durable: false},
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
        });
      });

      it('should allow connecting to a durable queue endpoint', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a durable queue endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const config: MessageConsumerProperties = {
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue', durable: true}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
        };
        solaceMessageClient.consume$(config).subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Expect connected to a durable queue endpoint
        expect(messageConsumerMock.messageConsumerProperties).toEqual({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue', durable: true}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
        });
      });

      it('should allow connecting to a durable topic endpoint', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const config: MessageConsumerProperties = {
          topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
          queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
        };
        solaceMessageClient.consume$(config).subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Expect connected to a durable topic endpoint
        expect(messageConsumerMock.messageConsumerProperties).toEqual({
          topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
          queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
        });
      });

      it('should receive messages', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic/*').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        const message1 = createTopicMessage('topic/1');
        await messageConsumerMock.simulateMessage(message1);

        expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({message: message1})]);

        // Simulate to receive another message
        const message2 = createTopicMessage('topic/2');
        await messageConsumerMock.simulateMessage(message2);

        expect(messageCaptor.getValues()).toEqual([
          jasmine.objectContaining<MessageEnvelope>({message: message1}),
          jasmine.objectContaining<MessageEnvelope>({message: message2}),
        ]);
      });

      it('should receive messages inside the Angular zone (by default)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        solaceMessageClient.consume$('topic').subscribe(observeCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        await messageConsumerMock.simulateMessage(createTopicMessage('topic'));

        // Expect message to be received inside the Angular zone
        expect(observeCaptor.getValues()).toEqual([true]);
      });

      it('should receive messages outside the Angular zone', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        solaceMessageClient.consume$({
          topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
          // @ts-expect-error: typedef(solclientjs): remove '@ts-expect-error' when changed 'queueDescriptor' to accept an object literal with 'name' as optional field
          // see 'solclient-fulljs' line 4301 that 'solclientjs' already supports the 'queueDescriptor' to be an object literal with 'name' as optional field. */
          queueDescriptor: {type: QueueType.TOPIC_ENDPOINT, durable: false},
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
          emitOutsideAngularZone: true,
        }).subscribe(observeCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        await messageConsumerMock.simulateMessage(createTopicMessage('topic'));

        // Expect message to be received outside the Angular zone
        expect(observeCaptor.getValues()).toEqual([false]);
      });

      it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a non-durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate that the connection cannot be established
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR, createOperationError());

        // Expect the Observable to error
        expect(messageCaptor.hasErrored()).toBeTrue();

        // Expect to disconnect from the broker
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(1);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(1);
      });

      it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a non-durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate the connection going down
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.DOWN, createOperationError());

        // Expect the Observable to complete
        expect(messageCaptor.hasCompleted()).toBeTrue();
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(0);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(1);
      });

      it('should gracefully disconnect from the broker when unsubscribing from the Observable', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a non-durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const subscription = solaceMessageClient.consume$('topic').subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Unsubscribe from the Observable
        messageConsumerMock.disableFiringDownEventOnDisconnect();
        subscription.unsubscribe();
        await drainMicrotaskQueue();

        // Expect a graceful disconnect
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(1);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(0);

        messageConsumerMock.messageConsumer.disconnect.calls.reset();

        // Simulate receiving 'MessageConsumerEventName.DOWN' event
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.DOWN);
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(0);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(1);
      });

      it('should provide substituted values of named wildcard segments', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('myhome/:room/temperature').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        const message = createTopicMessage('myhome/kitchen/temperature');
        await messageConsumerMock.simulateMessage(message);

        // Expect params to be contained in the envelope
        expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({
          message: message,
          params: new Map().set('room', 'kitchen'),
        })]);
      });

      it('should provide headers contained in the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        const message = createTopicMessage('topic');
        const userPropertyMap = new SDTMapContainer();
        userPropertyMap.addField('key1', SDTFieldType.STRING, 'value');
        userPropertyMap.addField('key2', SDTFieldType.BOOL, true);
        userPropertyMap.addField('key3', SDTFieldType.INT32, 123);
        message.setUserPropertyMap(userPropertyMap);

        await messageConsumerMock.simulateMessage(message);

        // Expect headers to be contained in the envelope
        expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({
          message: message,
          headers: new Map()
            .set('key1', 'value')
            .set('key2', true)
            .set('key3', 123),
        })]);
      });

      it('should notify when subscribed to an endpoint', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to endoint
        const messageConsumerMock = installMessageConsumerMock();
        const onSubscribedCallback1 = jasmine.createSpy('onSubscribed');
        solaceMessageClient.consume$({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
          onSubscribed: onSubscribedCallback1,
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribedCallback1).toHaveBeenCalledTimes(0);
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);
        expect(onSubscribedCallback1).toHaveBeenCalledTimes(1);
        expect(onSubscribedCallback1).toHaveBeenCalledWith(messageConsumerMock.messageConsumer);

        // Subscribe to endpoint anew
        const onSubscribedCallback2 = jasmine.createSpy('onSubscribed');
        solaceMessageClient.consume$({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
          onSubscribed: onSubscribedCallback2,
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribedCallback2).toHaveBeenCalledTimes(0);
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);
        expect(onSubscribedCallback2).toHaveBeenCalledTimes(1);
        expect(onSubscribedCallback2).toHaveBeenCalledWith(messageConsumerMock.messageConsumer);
      });

      it('should not notify when subscription to endpoint failed', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Subscribe to endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const onSubscribedCallback = jasmine.createSpy('onSubscribed');
        solaceMessageClient.consume$({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
          // @ts-expect-error: typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
          queueProperties: undefined,
          onSubscribed: onSubscribedCallback,
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR);
        expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
      });
    });

    describe('SolaceMessageClient#browse$', () => {

      it('should connect to a queue if passing a queue \'string\' literal', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        solaceMessageClient.browse$('queue').subscribe();
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Expect connected to the queue browser
        expect(queueBrowserMock.queueBrowserProperties).toEqual({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
        });
      });

      it('should allow connecting to a queue endpoint passing a config', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const properties: QueueBrowserProperties = {
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
        };
        solaceMessageClient.browse$(properties).subscribe();
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Expect connected to the queue browser
        expect(queueBrowserMock.queueBrowserProperties).toEqual(properties);
      });

      it('should allow browsing messages', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        const msg1 = createQueueMessage('queue');
        const msg2 = createQueueMessage('queue');
        const msg3 = createQueueMessage('queue');

        await queueBrowserMock.simulateMessage(msg1);
        await queueBrowserMock.simulateMessage(msg2);
        await queueBrowserMock.simulateMessage(msg3);

        expect(messageCaptor.getValues()).toEqual([
          jasmine.objectContaining<MessageEnvelope>({message: msg1}),
          jasmine.objectContaining<MessageEnvelope>({message: msg2}),
          jasmine.objectContaining<MessageEnvelope>({message: msg3}),
        ]);
      });

      it('should receive messages inside the Angular zone (by default)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        solaceMessageClient.browse$('queue').subscribe(observeCaptor);
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        await queueBrowserMock.simulateMessage(createQueueMessage('queue'));

        // Expect message to be received inside the Angular zone
        expect(observeCaptor.getValues()).toEqual([true]);
      });

      it('should receive messages outside the Angular zone', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        solaceMessageClient.browse$({
          queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
          emitOutsideAngularZone: true,
        }).subscribe(observeCaptor);
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        await queueBrowserMock.simulateMessage(createQueueMessage('queue'));

        // Expect message to be received outside the Angular zone
        expect(observeCaptor.getValues()).toEqual([false]);
      });

      it('should start the queue browser when connected to the broker (UP)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        solaceMessageClient.browse$('queue').subscribe();
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP, createOperationError());

        // Expect the queue browser to be started
        expect(queueBrowserMock.queueBrowser.start).toHaveBeenCalledTimes(1);
      });

      it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate that the connection cannot be established
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.CONNECT_FAILED_ERROR, createOperationError());

        // Expect the Observable to error
        expect(messageCaptor.hasErrored()).toBeTrue();

        // Expect to disconnect from the broker
        expect(queueBrowserMock.queueBrowser.stop).toHaveBeenCalledTimes(1);
        expect(queueBrowserMock.queueBrowser.disconnect).toHaveBeenCalledTimes(1);
      });

      it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate connection going down
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.DOWN, createOperationError());

        // Expect the Observable to complete
        expect(messageCaptor.hasCompleted()).toBeTrue();
      });

      it('should provide headers contained in the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        const message = createQueueMessage('queue');
        const userPropertyMap = new SDTMapContainer();
        userPropertyMap.addField('key1', SDTFieldType.STRING, 'value');
        userPropertyMap.addField('key2', SDTFieldType.BOOL, true);
        userPropertyMap.addField('key3', SDTFieldType.INT32, 123);
        message.setUserPropertyMap(userPropertyMap);

        await queueBrowserMock.simulateMessage(message);

        // Expect headers to be contained in the envelope
        expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({
          message: message,
          headers: new Map()
            .set('key1', 'value')
            .set('key2', true)
            .set('key3', 123),
        })]);
      });
    });
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace session.
   */
  async function simulateTopicMessage(message: Message): Promise<void> {
    const callback = sessionEventCallbacks.get(SessionEventCode.MESSAGE) as ((message: Message) => void);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${SessionEventCode.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to send a message to the Solace session.
   */
  async function simulateLifecycleEvent(eventCode: SessionEventCode, correlationKey?: object | string): Promise<void> {
    const callback = sessionEventCallbacks.get(eventCode) as (event: SessionEvent) => void;
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventCode}'`);
    }
    callback(createSessionEvent(eventCode, correlationKey));
    await drainMicrotaskQueue();
  }

  function createTopicMessage(topic: string): Message {
    const message = SolclientFactory.createMessage();
    message.setDestination(SolclientFactory.createTopicDestination(topic));
    return message;
  }

  function createQueueMessage(queue: string): Message {
    const message = SolclientFactory.createMessage();
    message.setDestination(SolclientFactory.createDurableQueueDestination(queue));
    return message;
  }

  /**
   * Captures the most recent invocation to {@link Session.subscribe}.
   */
  function installSessionSubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    session.subscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string | object | undefined, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link Session.unsubscribe}.
   */
  function installSessionUnsubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    session.unsubscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string | object | undefined, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link Session.send}.
   */
  function installSessionSendCaptor(): SessionSendCaptor {
    const captor = new SessionSendCaptor();
    session.send.and.callFake((message: Message) => {
      captor.message = message;
      captor.destination = message.getDestination();
      captor.type = message.getType();
    });
    return captor;
  }

  /**
   * Installs a message consumer mock;
   */
  function installMessageConsumerMock(): MessageConsumerMock {
    return new MessageConsumerMock(session);
  }

  /**
   * Installs a queue browser mock;
   */
  function installQueueBrowserMock(): QueueBrowserMock {
    return new QueueBrowserMock(session);
  }
});

class SessionSubscribeCaptor {

  public topic: string | undefined;
  public correlationKey: string | object | undefined;

  public reset(): void {
    this.topic = undefined;
    this.correlationKey = undefined;
  }
}

class SessionSendCaptor {

  public message: Message | undefined;
  public destination: Destination | undefined;
  public type: MessageType | undefined;

  public resset(): void {
    this.message = undefined;
    this.destination = undefined;
    this.type = undefined;
  }
}

function extractMessage(envelope: MessageEnvelope): Message {
  return envelope.message;
}

/**
 * Waits until all microtasks currently in the microtask queue completed. When this method returns,
 * the microtask queue may still not be empty, that is, when microtasks are scheduling other microtasks.
 */
async function drainMicrotaskQueue(): Promise<void> {
  await new Promise(resolve => asyncScheduler.schedule(resolve));
}

class MessageConsumerMock {

  private _callbacks = new Map<MessageConsumerEventName, MessageConsumerEventListener>();

  public messageConsumer: jasmine.SpyObj<MessageConsumer>;
  public messageConsumerProperties: MessageConsumerProperties | undefined;

  constructor(session: jasmine.SpyObj<Session>) {
    this.messageConsumer = jasmine.createSpyObj('messageConsumer', ['on', 'connect', 'disconnect', 'dispose']);
    // @ts-expect-error: typedef(solclientjs): remove when changed 'MessageConsumer#disposed' from 'void' to 'boolean'
    this.messageConsumer.disposed = false;

    // Configure session to return a message consumer mock and capture the passed config
    session.createMessageConsumer.and.callFake((messageConsumerProperties: MessageConsumerProperties): MessageConsumer => {
      this.messageConsumerProperties = messageConsumerProperties;
      return this.messageConsumer;
    });

    this.messageConsumer.on.and.callFake((eventName: MessageConsumerEventName, callback: MessageConsumerEventListener): MessageConsumer => {
      this._callbacks.set(eventName, callback);
      return this.messageConsumer;
    });

    this.installMockDefaultBehavior();
  }

  private installMockDefaultBehavior(): void {
    // Fire 'DOWN' event when invoking 'disconnect'
    this.messageConsumer.disconnect.and.callFake(() => this.simulateLifecycleEvent(MessageConsumerEventName.DOWN));

    // Mark message consumer disposed if calling 'dispose'
    this.messageConsumer.dispose.and.callFake(() => {
      // @ts-expect-error: typedef(solclientjs): remove when changed 'MessageConsumer#disposed' from 'void' to 'boolean'
      this.messageConsumer.disposed = true;
    });
  }

  /**
   * Disables automatically firing 'MessageConsumerEventName.DOWN' event when calling 'disconnect'.
   */
  public disableFiringDownEventOnDisconnect(): void {
    this.messageConsumer.disconnect.and.callFake(noop);
  }

  /**
   * Simulates the Solace message broker to send a message to the Solace message consumer.
   */
  public async simulateLifecycleEvent(eventName: MessageConsumerEventName, event?: OperationError | MessageConsumerEvent): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    callback(event as any);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace message consumer.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(MessageConsumerEventName.MESSAGE) as (message: Message) => void;
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${MessageConsumerEventName.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }
}

class QueueBrowserMock {

  private _callbacks = new Map<QueueBrowserEventName, QueueBrowserEventListener>();

  public queueBrowser: jasmine.SpyObj<QueueBrowser>;
  public queueBrowserProperties: QueueBrowserProperties | undefined;

  constructor(session: jasmine.SpyObj<Session>) {
    this.queueBrowser = jasmine.createSpyObj('queueBrowser', ['on', 'connect', 'disconnect', 'start', 'stop']);

    // Configure session to return a queue browser mock and capture the passed config
    session.createQueueBrowser.and.callFake((queueBrowserProperties: QueueBrowserProperties): QueueBrowser => {
      this.queueBrowserProperties = queueBrowserProperties;
      return this.queueBrowser;
    });

    // Capture Solace lifecycle hooks
    this.queueBrowser.on.and.callFake((eventName: QueueBrowserEventName, callback: QueueBrowserEventListener) => {
      this._callbacks.set(eventName, callback);
      return this.queueBrowser;
    });

    this.installMockDefaultBehavior();
  }

  private installMockDefaultBehavior(): void {
    // Fire 'DOWN' event when invoking 'disconnect'
    this.queueBrowser.disconnect.and.callFake(() => {
      this.simulateLifecycleEvent(QueueBrowserEventName.DOWN);
      this.simulateLifecycleEvent(QueueBrowserEventName.DISPOSED);
    });
  }

  /**
   * Simulates the Solace message broker to send a message to the Solace queue browser.
   */
  public async simulateLifecycleEvent(eventName: QueueBrowserEventName, error?: OperationError): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    else if (error instanceof OperationError) {
      ((callback) as (error: OperationError) => void)(error);
    }
    else {
      ((callback) as () => void)();
    }
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace queue browser.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(QueueBrowserEventName.MESSAGE) as (message: Message) => void;
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${QueueBrowserEventName.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }
}

function createSessionEvent(sessionEventCode: SessionEventCode, correlationKey?: object | string): SessionEvent {
  // @ts-expect-error: constructor of {@link SessionEvent} is protected.
  return new SessionEvent(
    [] /* superclassArgs */,
    sessionEventCode,
    null /* infoStr */,
    null /* responseCode */,
    null /* errorSubcode */,
    correlationKey,
    null/* reason */,
  );
}

function createOperationError(): OperationError {
  // @ts-expect-error: constructor of {@link OperationError} is protected.
  return new OperationError();
}
