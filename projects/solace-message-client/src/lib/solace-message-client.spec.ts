import * as solace from 'solclientjs/lib-browser/solclient-full.js';
import { SolaceMessageClientModule } from './solace-message-client.module';
import { mapToBinary, mapToText, MessageEnvelope, Params, PublishOptions, SolaceMessageClient } from './solace-message-client';
import { SolaceSessionProvider } from './solace-session-provider';
import { ObserveCaptor } from '@scion/toolkit/testing';
import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { Destination, DestinationType, Message, MessageConsumer, MessageConsumerEventName, MessageConsumerProperties, MessageDeliveryModeType, MessageType, QueueBrowser, QueueBrowserEventName, QueueBrowserProperties, QueueType, SDTFieldType, Session, SessionEvent, SessionEventCode, SolaceError } from './solace.model';
import { SolaceObjectFactory } from './solace-object-factory';
import { asyncScheduler, noop } from 'rxjs';
import { UUID } from '@scion/toolkit/uuid';
import createSpyObj = jasmine.createSpyObj;
import SpyObj = jasmine.SpyObj;

// tslint:disable:variable-name
describe('SolaceMessageClient', () => {

  let session: SpyObj<Session>;
  let sessionProvider: SpyObj<SolaceSessionProvider>;
  const sessionEventCallbacks = new Map<SessionEventCode, (event: SessionEvent | Message) => void>();

  beforeEach(() => {
    const factoryProperties = new solace.SolclientFactoryProperties();
    factoryProperties.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProperties);
    // Mock the Solace Session
    session = createSpyObj('sessionClient', ['on', 'connect', 'subscribe', 'unsubscribe', 'send', 'dispose', 'disconnect', 'createMessageConsumer', 'createQueueBrowser']);
    // Capture Solace lifecycle hooks
    session.on.and.callFake((eventCode: SessionEventCode, callback: (event: SessionEvent | Message) => void) => {
      sessionEventCallbacks.set(eventCode, callback);
    });
    // Fire 'DISCONNECTED' event when invoking 'disconnect'.
    session.disconnect.and.callFake(() => simulateLifecycleEvent(SessionEventCode.DISCONNECTED));

    sessionProvider = createSpyObj('SolaceSessionProvider', ['provide']);
    sessionProvider.provide.and.returnValue(session);
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

    describe('core functionality', () => testCoreFunctionality());
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

      beforeEach(() => {
        TestBed.inject(SolaceMessageClient).connect({url: 'some-url', vpnName: 'some-vpn'});
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

      // Connect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
    });

    it('should create a single subscription per topic on the Solace session', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to topic-1
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const subscription1 = solaceMessageClient.observe$('topic-1').subscribe();
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
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
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      session.unsubscribe.calls.reset();
      sessionUnsubscribeCaptor.reset();

      // Unsubscribe from topic-2 (subscription 4)
      subscription4.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    });

    it('should error when failing to subscribe to a topic on the Solace session', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      const observeCaptor = new ObserveCaptor();
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const subscription = solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const observeCaptor = new ObserveCaptor();
      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

      // Simulate the subscription to succeed
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      session.unsubscribe.calls.reset();

      // Unsubscribe from the topic
      subscription.unsubscribe();
      await drainMicrotaskQueue();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    });

    it('should not unsubscribe more specific topics when unsubscribing from a wildcard topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/*/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
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
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/livingroom/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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

    it('should allow wildcard subscriptions', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      message.setSdtContainer(SolaceObjectFactory.createSDTField(SDTFieldType.STRING, '20°C'));

      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom')})]);
      expect(observeCaptor2.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom').set('measurement', 'temperature')})]);
      expect(observeCaptor3.getValues()).toEqual([['20°C', new Map().set('room', 'livingroom'), message]]);
    });

    it('should emit messages inside of the Angular zone', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to topic
      let receivedMessageInsideAngularZone;
      solaceMessageClient.observe$('topic').subscribe(() => {
        receivedMessageInsideAngularZone = NgZone.isInAngularZone();
      });
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message = createTopicMessage('topic');
      simulateTopicMessage(message);

      expect(receivedMessageInsideAngularZone).toBeTrue();
    });

    it('should notify when subscribed to topic destination', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Connect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic
      let onSubscribed1Called = false;
      solaceMessageClient.observe$('topic', {
        onSubscribed(): void {
          onSubscribed1Called = true;
        },
      }).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribed` callback to be invoked after the receipt of `SUBSCRIPTION_OK` event
      expect(onSubscribed1Called).toBeFalse();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(onSubscribed1Called).toBeTrue();
      sessionSubscribeCaptor.reset();

      // Subscribe to topic anew
      let onSubscribed2Called = false;
      solaceMessageClient.observe$('topic', {
        onSubscribed(): void {
          onSubscribed2Called = true;
        },
      }).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribed` callback to be invoked immediately
      expect(onSubscribed2Called).toBeTrue();
    });

    it('should not notify when subscription to topic destination failed', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Connect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic
      let onSubscribedCalled = false;
      solaceMessageClient.observe$('topic', {
        onSubscribed(): void {
          onSubscribedCalled = true;
        },
      }).subscribe();
      await drainMicrotaskQueue();

      // Expect `onSubscribedCalled` callback not to be invoked after the receipt of `SUBSCRIPTION_ERROR` event
      expect(onSubscribedCalled).toBeFalse();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(onSubscribedCalled).toBeFalse();
    });

    it('should publish a message to a topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message to a topic
      await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.destination.getType()).toEqual(DestinationType.TOPIC);
    });

    it('should publish a message to a queue', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message to a queue
      await expectAsync(solaceMessageClient.enqueue('queue', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('queue');
      expect(sessionSendCaptor.destination.getType()).toEqual(DestinationType.QUEUE);
    });

    it('should publish a message as binary message (by default)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message.getBinaryAttachment()).toEqual('payload');
    });

    it('should allow publishing a message as structured text message (SDT Structured Data Type)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createSDTField(SDTFieldType.STRING, 'payload'))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.TEXT);
      expect(sessionSendCaptor.message.getSdtContainer().getValue()).toEqual('payload');
    });

    it('should allow publishing a message as structured map message (SDT Structured Data Type)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      const mapContainer = SolaceObjectFactory.createSDTMapContainer();
      mapContainer.addField('key', SDTFieldType.STRING, 'value');
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createSDTField(SDTFieldType.MAP, mapContainer))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.MAP);
      expect(sessionSendCaptor.message.getSdtContainer().getValue()).toEqual(mapContainer);
    });

    it('should allow publishing a message as given', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      const message = SolaceObjectFactory.createMessage();
      message.setCorrelationId('123');
      await expectAsync(solaceMessageClient.publish('topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
    });

    it('should ignore the topic set on the message', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      const message = SolaceObjectFactory.createMessage();
      message.setDestination(SolaceObjectFactory.createTopicDestination('message-topic'));
      await expectAsync(solaceMessageClient.publish('publish-topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('publish-topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
    });

    it('should allow intercepting the message before sent over the network', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload', {
        intercept: msg => {
          msg.setPriority(123);
        },
      })).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.destination.getName()).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
    });

    it('should publish a message as direct message (by default)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic')).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
    });

    it('should allow controlling publishing of the message by passing options', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      const publishOptions: PublishOptions = {
        dmqEligible: true,
        correlationId: '123',
        priority: 123,
        timeToLive: 123,
      };

      // publish binary message
      await expectAsync(solaceMessageClient.publish('topic', 'blubber', publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
      expect(sessionSendCaptor.message.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message.getTimeToLive()).toEqual(123);

      // publish a Solace message
      session.send.calls.reset();
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createMessage(), publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
      expect(sessionSendCaptor.message.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message.getTimeToLive()).toEqual(123);
    });

    it('should map a structured text message into its textual representation', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();
      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving message published to 'myhome/kitchen/temperature'
      const message = createTopicMessage('myhome/kitchen/temperature');
      message.setSdtContainer(SolaceObjectFactory.createSDTField(SDTFieldType.STRING, 'textual-payload'));
      simulateTopicMessage(message);

      await observeCaptor.waitUntilEmitCount(1);
      expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['textual-payload', new Map().set('room', 'kitchen'), message]]);
    });

    it('should map a binary message into its binary representation', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();

      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToBinary()).subscribe(observeCaptor);
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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      await solaceMessageClient.disconnect();

      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should clear Solace subscription registry when disconnecting from the broker', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to 'topic'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
    });

    it('should not cancel Solace subscriptions but complete Observables when the Solace session died (e.g. network interruption, with the max reconnect count exceeded)', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Simulate the connection goes irreparably down
      await simulateLifecycleEvent(SessionEventCode.DOWN_ERROR);

      expect(session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });

    it(`should invoke 'solace.session.dispose()' but not 'solace.session.disconnect()' when receiving DISCONNECT confirmation event`, async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

      // Simulate the session to be disconnected
      await simulateLifecycleEvent(SessionEventCode.DISCONNECTED);

      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.dispose).toHaveBeenCalledTimes(1);
    });

    it(`should invoke 'solace.session.dispose()' only when received DISCONNECT confirmation event from the broker`, async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-1`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-2`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-2`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-3`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate error confirmation of subscription for topic `topic-3`
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(topic3SubscribeCaptor.hasErrored()).toBeTrue();

      // expect single call to `session.subscribe` for subscription of `topic-4`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-4'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      await drainMicrotaskQueue();
    });

    it('should subscribe and unsubscribe sequentially on the same topic', async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 1
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 1)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of unsubscription 1
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 2
      await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();
    });

    describe('Guraranteed messaging', () => {
      it('should resolve the "Publish Promise" when the broker acknowledges the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.DIRECT});
        await drainMicrotaskQueue();
        await expectAsync(whenPublished).toBeResolved();
      });
    });

    describe('headers', () => {

      it('should publish message headers (user properties)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        const sessionSendCaptor = installSessionSendCaptor();
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // publish the message
        const headers = new Map()
          .set('key1', 'value')
          .set('key2', true)
          .set('key3', false)
          .set('key4', 123)
          .set('key5', 0)
          .set('key6', SolaceObjectFactory.createSDTField(SDTFieldType.INT16, 16))
          .set('key7', SolaceObjectFactory.createSDTField(SDTFieldType.INT32, 32))
          .set('key8', SolaceObjectFactory.createSDTField(SDTFieldType.INT64, 64))
          .set('key9', SolaceObjectFactory.createSDTField(SDTFieldType.UNKNOWN, '!UNKNOWN!'))
          .set('key10', undefined)
          .set('key11', null);

        await expectAsync(solaceMessageClient.publish('topic', 'payload', {headers})).toBeResolved();

        const userPropertyMap = sessionSendCaptor.message.getUserPropertyMap();
        expect(userPropertyMap.getKeys()).toEqual(['key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7', 'key8', 'key9']);

        expect(userPropertyMap.getField('key1').getType()).toEqual(SDTFieldType.STRING);
        expect(userPropertyMap.getField('key1').getValue()).toEqual('value');

        expect(userPropertyMap.getField('key2').getType()).toEqual(SDTFieldType.BOOL);
        expect(userPropertyMap.getField('key2').getValue()).toEqual(true);

        expect(userPropertyMap.getField('key3').getType()).toEqual(SDTFieldType.BOOL);
        expect(userPropertyMap.getField('key3').getValue()).toEqual(false);

        expect(userPropertyMap.getField('key4').getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key4').getValue()).toEqual(123);

        expect(userPropertyMap.getField('key5').getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key5').getValue()).toEqual(0);

        expect(userPropertyMap.getField('key6').getType()).toEqual(SDTFieldType.INT16);
        expect(userPropertyMap.getField('key6').getValue()).toEqual(16);

        expect(userPropertyMap.getField('key7').getType()).toEqual(SDTFieldType.INT32);
        expect(userPropertyMap.getField('key7').getValue()).toEqual(32);

        expect(userPropertyMap.getField('key8').getType()).toEqual(SDTFieldType.INT64);
        expect(userPropertyMap.getField('key8').getValue()).toEqual(64);

        expect(userPropertyMap.getField('key9').getType()).toEqual(SDTFieldType.UNKNOWN);
        expect(userPropertyMap.getField('key9').getValue()).toEqual('!UNKNOWN!');
      });

      it('should receive message headers (user properties)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to topic 'topic'
        const sessionSubscribeCaptor = installSessionSubscribeCaptor();
        const observeCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.observe$('topic').subscribe(observeCaptor);
        await drainMicrotaskQueue();
        await simulateLifecycleEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

        // Simulate receiving message published to 'topic'
        const message = createTopicMessage('topic');
        const userPropertyMap = SolaceObjectFactory.createSDTMapContainer();
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

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
          topicEndpointSubscription: SolaceObjectFactory.createTopicDestination('topic'),
          queueDescriptor: {
            type: QueueType.TOPIC_ENDPOINT, durable: false,
          },
        });
      });

      it('should allow connecting to a durable queue endpoint', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to a durable queue endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const config: MessageConsumerProperties = {
          queueDescriptor: {type: QueueType.QUEUE, name: 'queue', durable: true},
        };
        solaceMessageClient.consume$(config).subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Expect connected to a durable queue endpoint
        expect(messageConsumerMock.messageConsumerProperties).toEqual({
          queueDescriptor: {type: QueueType.QUEUE, name: 'queue', durable: true},
        });
      });

      it('should allow connecting to a durable topic endpoint', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to a durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const config: MessageConsumerProperties = {
          topicEndpointSubscription: SolaceObjectFactory.createTopicDestination('topic'),
          queueDescriptor: {type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true},
        };
        solaceMessageClient.consume$(config).subscribe();
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Expect connected to a durable topic endpoint
        expect(messageConsumerMock.messageConsumerProperties).toEqual({
          topicEndpointSubscription: SolaceObjectFactory.createTopicDestination('topic'),
          queueDescriptor: {type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true},
        });
      });

      it('should receive messages', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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

      it('should receive messages inside the Angular zone', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        let receivedMessageInsideAngularZone;
        solaceMessageClient.consume$('topic').subscribe(() => {
          receivedMessageInsideAngularZone = NgZone.isInAngularZone();
        });
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        await messageConsumerMock.simulateMessage(createTopicMessage('topic'));

        // Expect message to be received inside the Angular zone
        expect(receivedMessageInsideAngularZone).toBeTrue();
      });

      it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to a non-durable topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the message consumer to connect to the broker
        expect(messageConsumerMock.messageConsumer.connect).toHaveBeenCalledTimes(1);

        // Simulate that the connection cannot be established
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR, new Error());

        // Expect the Observable to error
        expect(messageCaptor.hasErrored()).toBeTrue();

        // Expect to disconnect from the broker
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(1);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(1);
      });

      it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.DOWN, new Error());

        // Expect the Observable to complete
        expect(messageCaptor.hasCompleted()).toBeTrue();
        expect(messageConsumerMock.messageConsumer.disconnect).toHaveBeenCalledTimes(0);
        expect(messageConsumerMock.messageConsumer.dispose).toHaveBeenCalledTimes(1);
      });

      it('should gracefully disconnect from the broker when unsubscribing from the Observable', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to a topic endpoint
        const messageConsumerMock = installMessageConsumerMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.consume$('topic').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);

        // Simulate to receive a message
        const message = createTopicMessage('topic');
        const userPropertyMap = SolaceObjectFactory.createSDTMapContainer();
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

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to endoint
        const messageConsumerMock = installMessageConsumerMock();
        let onSubscribed1Called = false;
        solaceMessageClient.consume$({
          queueDescriptor: {
            type: QueueType.QUEUE,
            name: 'queue',
          },
          onSubscribed(): void {
            onSubscribed1Called = true;
          },
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribed1Called).toBeFalse();
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);
        expect(onSubscribed1Called).toBeTrue();

        // Subscribe to endpoint anew
        let onSubscribed2Called = false;
        solaceMessageClient.consume$({
          queueDescriptor: {
            type: QueueType.QUEUE,
            name: 'queue',
          },
          onSubscribed(): void {
            onSubscribed2Called = true;
          },
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribed2Called).toBeFalse();
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.UP);
        expect(onSubscribed2Called).toBeTrue();
      });

      it('should not notify when subscription to endpoint failed', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Subscribe to endpoint
        const messageConsumerMock = installMessageConsumerMock();
        let onSubscribedCalled = false;
        solaceMessageClient.consume$({
          queueDescriptor: {
            type: QueueType.QUEUE,
            name: 'queue',
          },
          onSubscribed(): void {
            onSubscribedCalled = true;
          },
        }).subscribe();
        await drainMicrotaskQueue();

        // Simulate the message consumer to be connected to the broker
        expect(onSubscribedCalled).toBeFalse();
        await messageConsumerMock.simulateLifecycleEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR);
        expect(onSubscribedCalled).toBeFalse();
      });
    });

    describe('SolaceMessageClient#browse$', () => {

      it('should connect to a queue if passing a queue \'string\' literal', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
          queueDescriptor: {
            type: QueueType.QUEUE, name: 'queue',
          },
        });
      });

      it('should allow connecting to a queue endpoint passing a config', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const properties: QueueBrowserProperties = {
          queueDescriptor: {
            type: QueueType.QUEUE, name: 'queue',
          },
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

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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

      it('should receive messages inside the Angular zone', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        let receivedMessageInsideAngularZone;
        solaceMessageClient.browse$('queue').subscribe(() => {
          receivedMessageInsideAngularZone = NgZone.isInAngularZone();
        });
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        await queueBrowserMock.simulateMessage(createQueueMessage('queue'));

        // Expect message to be received inside the Angular zone
        expect(receivedMessageInsideAngularZone).toBeTrue();
      });

      it('should start the queue browser when connected to the broker (UP)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        solaceMessageClient.browse$('queue').subscribe();
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP, new Error());

        // Expect the queue browser to be started
        expect(queueBrowserMock.queueBrowser.start).toHaveBeenCalledTimes(1);
      });

      it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Expect the queue browser to connect to the broker
        expect(queueBrowserMock.queueBrowser.connect).toHaveBeenCalledTimes(1);

        // Simulate that the connection cannot be established
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.CONNECT_FAILED_ERROR, new Error());

        // Expect the Observable to error
        expect(messageCaptor.hasErrored()).toBeTrue();

        // Expect to disconnect from the broker
        expect(queueBrowserMock.queueBrowser.stop).toHaveBeenCalledTimes(1);
        expect(queueBrowserMock.queueBrowser.disconnect).toHaveBeenCalledTimes(1);
      });

      it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

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
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.DOWN, new Error());

        // Expect the Observable to complete
        expect(messageCaptor.hasCompleted()).toBeTrue();
      });

      it('should provide headers contained in the message', async () => {
        const solaceMessageClient = TestBed.inject(SolaceMessageClient);

        // Connect to the broker
        solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
        await simulateLifecycleEvent(SessionEventCode.UP_NOTICE);

        // Connect to the queue browser
        const queueBrowserMock = installQueueBrowserMock();
        const messageCaptor = new ObserveCaptor<MessageEnvelope>();
        solaceMessageClient.browse$('queue').subscribe(messageCaptor);
        await drainMicrotaskQueue();

        // Simulate the queue browser to be connected to the broker
        await queueBrowserMock.simulateLifecycleEvent(QueueBrowserEventName.UP);

        // Simulate to receive a message
        const message = createQueueMessage('queue');
        const userPropertyMap = SolaceObjectFactory.createSDTMapContainer();
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
    const callback = sessionEventCallbacks.get(SessionEventCode.MESSAGE);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${SessionEventCode.MESSAGE}'`);
    }
    callback && callback(message);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to send a message to the Solace session.
   */
  async function simulateLifecycleEvent(eventCode: SessionEventCode, correlationKey?: string): Promise<void> {
    await drainMicrotaskQueue();

    const callback = sessionEventCallbacks.get(eventCode);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventCode}'`);
    }
    callback && callback(new solace.SessionEvent(
      null /* superclassArgs */,
      eventCode,
      null /* infoStr */,
      null /* responseCode */,
      null /* errorSubcode */,
      correlationKey,
      null/* reason */),
    );
    await drainMicrotaskQueue();
  }

  function createTopicMessage(topic: string): Message {
    const message = SolaceObjectFactory.createMessage();
    message.setDestination(SolaceObjectFactory.createTopicDestination(topic));
    return message;
  }

  function createQueueMessage(queue: string): Message {
    const message = SolaceObjectFactory.createMessage();
    message.setDestination(SolaceObjectFactory.createDurableQueueDestination(queue));
    return message;
  }

  /**
   * Captures the most recent invocation to {@link Session.subscribe}.
   */
  function installSessionSubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    session.subscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string, _requestTimeout: number) => {
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
    session.unsubscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string, _requestTimeout: number) => {
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

  public topic: string;
  public correlationKey: string;

  public reset(): void {
    this.topic = undefined;
    this.correlationKey = undefined;
  }
}

class SessionSendCaptor {

  public message: Message;
  public destination: Destination;
  public type: MessageType;

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

  private _callbacks = new Map<MessageConsumerEventName, (event: Message | SolaceError | void) => void>();

  public messageConsumer: SpyObj<MessageConsumer>;
  public messageConsumerProperties: MessageConsumerProperties;

  constructor(session: SpyObj<Session>) {
    this.messageConsumer = createSpyObj('messageConsumer', ['on', 'connect', 'disconnect', 'dispose']);
    this.messageConsumer.disposed = false;

    // Configure session to return a message consumer mock and capture the passed config
    session.createMessageConsumer.and.callFake((messageConsumerProperties: MessageConsumerProperties) => {
      this.messageConsumerProperties = messageConsumerProperties;
      return this.messageConsumer;
    });

    // Capture Solace lifecycle hooks
    this.messageConsumer.on.and.callFake((eventName: MessageConsumerEventName, callback: (event: Message | SolaceError | void) => void) => {
      this._callbacks.set(eventName, callback);
    });

    this.installMockDefaultBehavior();
  }

  private installMockDefaultBehavior(): void {
    // Fire 'DOWN' event when invoking 'disconnect'
    this.messageConsumer.disconnect.and.callFake(() => this.simulateLifecycleEvent(MessageConsumerEventName.DOWN));

    // Mark message consumer disposed if calling 'dispose'
    this.messageConsumer.dispose.and.callFake(() => {
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
  public async simulateLifecycleEvent(eventName: MessageConsumerEventName, error?: SolaceError): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    callback && callback(error);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace message consumer.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(MessageConsumerEventName.MESSAGE);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${MessageConsumerEventName.MESSAGE}'`);
    }
    callback && callback(message);
    await drainMicrotaskQueue();
  }
}

class QueueBrowserMock {

  private _callbacks = new Map<QueueBrowserEventName, (event: Message | SolaceError | void) => void>();

  public queueBrowser: SpyObj<QueueBrowser>;
  public queueBrowserProperties: QueueBrowserProperties;

  constructor(session: SpyObj<Session>) {
    this.queueBrowser = createSpyObj('queueBrowser', ['on', 'connect', 'disconnect', 'start', 'stop']);

    // Configure session to return a queue browser mock and capture the passed config
    session.createQueueBrowser.and.callFake((queueBrowserProperties: QueueBrowserProperties) => {
      this.queueBrowserProperties = queueBrowserProperties;
      return this.queueBrowser;
    });

    // Capture Solace lifecycle hooks
    this.queueBrowser.on.and.callFake((eventName: QueueBrowserEventName, callback: (event: Message | SolaceError | void) => void) => {
      this._callbacks.set(eventName, callback);
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
  public async simulateLifecycleEvent(eventName: QueueBrowserEventName, error?: SolaceError): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    callback && callback(error);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace queue browser.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(QueueBrowserEventName.MESSAGE);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${QueueBrowserEventName.MESSAGE}'`);
    }
    callback && callback(message);
    await drainMicrotaskQueue();
  }
}
