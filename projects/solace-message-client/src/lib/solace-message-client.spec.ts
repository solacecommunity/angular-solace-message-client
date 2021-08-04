import * as solace from 'solclientjs/lib-browser/solclient-full.js';
import { SolaceMessageClientModule } from './solace-message-client.module';
import { mapToBinary, mapToText, MessageEnvelope, Params, PublishOptions, SolaceMessageClient } from './solace-message-client';
import { SolaceSessionProvider } from './solace-session-provider';
import { ObserveCaptor } from '@scion/toolkit/testing';
import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { Message, MessageDeliveryModeType, MessageType, SDTFieldType } from './solace.model';
import { SolaceObjectFactory } from './solace-object-factory';
import createSpyObj = jasmine.createSpyObj;
import SpyObj = jasmine.SpyObj;

// tslint:disable:variable-name
describe('SolaceMessageClient', () => {

  let session: SpyObj<solace.Session>;
  let sessionProvider: SpyObj<SolaceSessionProvider>;
  const sessionEventCallbacks = new Map<solace.SessionEventCode, (event: solace.SessionEvent | Message) => void>();

  beforeEach(() => {
    const factoryProperties = new solace.SolclientFactoryProperties();
    factoryProperties.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProperties);
    // Mock the Solace Session
    session = createSpyObj('sessionClient', ['on', 'connect', 'subscribe', 'unsubscribe', 'send', 'dispose', 'disconnect']);
    // Capture Solace lifecycle hooks
    session.on.and.callFake((eventCode: solace.SessionEventCode, callback: (event: solace.SessionEvent | Message) => void) => {
      sessionEventCallbacks.set(eventCode, callback);
    });

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

    it('should connect to the Solace message broker when injecting `SolaceMessageClient`', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledTimes(1);
      await expectAsync(solaceMessageClient.session).toBeResolved();
    }));

    it('should allow to disconnect and re-connect from the Solace message broker', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
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
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
      await expectAsync(solaceMessageClient.session).toBeResolved();

      await connected;
      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-other-url', vpnName: 'some-other-vpn'}));
    }));

    it('should connect with the config as provided in \'SolaceMessageClientModule.forRoot({...})\'', fakeAsync(async () => {
      TestBed.inject(SolaceMessageClient);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url:forRoot', vpnName: 'vpn:forRoot'}));
    }));

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

    it('should not connect to the Solace message broker when injecting `SolaceMessageClient`', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await expectAsync(solaceMessageClient.session).toBeRejected();
      expect(session.connect).toHaveBeenCalledTimes(0);
      expect(sessionProvider.provide).toHaveBeenCalledTimes(0);
    }));

    it('should allow to connect and disconnect from the Solace message broker', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Connect
      expectAsync(solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'})).toBeResolved();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
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
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
      await expectAsync(solaceMessageClient.session).toBeResolved();

      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-other-url', vpnName: 'some-other-vpn'}));
    }));

    it('should reject the connect Promise when the connect attempt fails', fakeAsync(() => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      expectAsync(solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'})).toBeRejected();
      simulateLifecycleEvent(solace.SessionEventCode.CONNECT_FAILED_ERROR, undefined);
      expect(session.connect).toHaveBeenCalledTimes(1);
      expect(sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'some-url', vpnName: 'some-vpn'}));
    }));

    it('should clear pending subscriptions when the connection goes down', fakeAsync(() => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      // Connect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // Subscribe to topic-1 (success)
      solaceMessageClient.observe$('topic-1').subscribe();
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Subscribe to topic-2 (pending confirmation)
      solaceMessageClient.observe$('topic-2').subscribe();
      flushMicrotasks();

      // Simulate the connection to be permanently down
      simulateLifecycleEvent(solace.SessionEventCode.DOWN_ERROR);

      // Reconnect to the broker
      solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
      session.subscribe.calls.reset();

      // Subscribe to topic-3 (success)
      solaceMessageClient.observe$('topic-3').subscribe();
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
    }));

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
    it('should create a single subscription per topic on the Solace session', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic-1
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const subscription1 = solaceMessageClient.observe$('topic-1').subscribe();
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe again to topic-1
      const subscription2 = solaceMessageClient.observe$('topic-1').subscribe();
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe again to topic-1
      const subscription3 = solaceMessageClient.observe$('topic-1').subscribe();
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Subscribe to topic-2
      const subscription4 = solaceMessageClient.observe$('topic-2').subscribe();
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Unsubscribe from topic-1 (subscription 1)
      subscription1.unsubscribe();
      flushMicrotasks();
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);

      // Unsubscribe from topic-1 (subscription 3)
      subscription3.unsubscribe();
      flushMicrotasks();
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);

      // Unsubscribe from topic-1 (subscription 2)
      subscription2.unsubscribe();
      flushMicrotasks();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      session.unsubscribe.calls.reset();
      sessionUnsubscribeCaptor.reset();

      // Unsubscribe from topic-2 (subscription 4)
      subscription4.unsubscribe();
      flushMicrotasks();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    }));

    it('should error when failing to subscribe to a topic on the Solace session', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const observeCaptor = new ObserveCaptor();
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const subscription = solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();

      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

      // Simulate the subscription to fail
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);

      // Expect the Observable to error
      expect(observeCaptor.hasErrored()).toEqual(true);
      expect(observeCaptor.hasCompleted()).toEqual(false);
      expect(subscription.closed).toEqual(true);

      // Expect that SolaceMessageClient did not invoke unsubscribe
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
    }));

    it('should subscribe to a topic on the Solace session even if a previous subscription for the same topic failed', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      const observeCaptor = new ObserveCaptor();
      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

      // Simulate the subscription to error
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasErrored()).toBeTrue();

      // Reset mock invocations
      sessionSubscribeCaptor.reset();
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // Subscribe to the topic anew
      const subscription = solaceMessageClient.observe$('topic').subscribe();
      flushMicrotasks();

      // Expect the SolaceMessageClient to invoke subscribe on the Solace session for that topic
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);

      // Simulate the subscription to succeed
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      session.unsubscribe.calls.reset();

      // Unsubscribe from the topic
      subscription.unsubscribe();
      flushMicrotasks();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    }));

    it('should not unsubscribe more specific topics when unsubscribing from a wildcard topic', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'myhome/*/temperature'
      const observeCaptor1 = new ObserveCaptor(extractMessage);
      const wildcardSubscription = solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Subscribe to topic 'myhome/livingroom/kitchen'
      const observeCaptor2 = new ObserveCaptor(extractMessage);
      const exactSubscription = solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(observeCaptor2);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/kitchen'
      const message1 = createTopicMessage('myhome/livingroom/temperature');
      simulateTopicMessage(message1);
      expect(observeCaptor1.getValues()).toEqual([message1]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message1]); // topic: myhome/livingroom/temperature

      observeCaptor1.reset();
      observeCaptor2.reset();

      // Unsubscribe wildcard subscription
      wildcardSubscription.unsubscribe();
      flushMicrotasks();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/*/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      sessionUnsubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/temperature'
      const message2 = createTopicMessage('myhome/livingroom/temperature');
      simulateTopicMessage(message2);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([message2]); // topic: myhome/livingroom/temperature

      observeCaptor1.reset();
      observeCaptor2.reset();
      session.unsubscribe.calls.reset();

      // Unsubscribe exact subscription
      exactSubscription.unsubscribe();
      flushMicrotasks();
      expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/livingroom/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      // Simulate receiving message published to 'myhome/livingroom/temperature'
      const message3 = createTopicMessage('myhome/livingroom/temperature');
      simulateTopicMessage(message3);
      expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
      expect(observeCaptor2.getValues()).toEqual([]); // topic: myhome/livingroom/temperature
    }));

    it('should receive messages sent to a topic', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic-1
      const observeCaptor1_topic1 = new ObserveCaptor(extractMessage);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();

      const subscription1_topic1 = solaceMessageClient.observe$('topic-1').subscribe(observeCaptor1_topic1);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message1 = createTopicMessage('topic-1');
      simulateTopicMessage(message1);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1]);

      // Simulate receiving a message from the Solace broker
      const message2 = createTopicMessage('topic-1');
      simulateTopicMessage(message2);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

      // Simulate receiving a message from the Solace broker
      const message3 = createTopicMessage('topic-2');
      simulateTopicMessage(message3);
      expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

      // Subscribe to topic-2
      const observeCaptor2_topic2 = new ObserveCaptor(extractMessage);
      const subscription2_topic2 = solaceMessageClient.observe$('topic-2').subscribe(observeCaptor2_topic2);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message4 = createTopicMessage('topic-1');
      simulateTopicMessage(message4);
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
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

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
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

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
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

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
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

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
    }));

    it('should allow wildcard subscriptions', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const observeCaptor1 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor2 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/*/*').subscribe(observeCaptor2);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor3 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/>').subscribe(observeCaptor3);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor4 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/kitchen/*').subscribe(observeCaptor4);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor5 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/kitchen/temperature/>').subscribe(observeCaptor5);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      sessionSubscribeCaptor.reset();

      const observeCaptor6 = new ObserveCaptor(extractMessage);
      solaceMessageClient.observe$('myhome/floor4/kitchen/temperature/celsius').subscribe(observeCaptor6);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
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
    }));

    it('should provide substituted values of named wildcard segments', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const observeCaptor1 = new ObserveCaptor<MessageEnvelope>();
      solaceMessageClient.observe$('myhome/:room/temperature').subscribe(observeCaptor1);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      const observeCaptor2 = new ObserveCaptor<MessageEnvelope>();
      solaceMessageClient.observe$('myhome/:room/:measurement').subscribe(observeCaptor2);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      const observeCaptor3 = new ObserveCaptor<[string, Params, Message]>();
      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor3);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message = createTopicMessage('myhome/livingroom/temperature');
      message.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, '20°C'));

      simulateTopicMessage(message);
      expect(observeCaptor1.getValues()).toEqual([{message, params: new Map().set('room', 'livingroom')}]);
      expect(observeCaptor2.getValues()).toEqual([{message, params: new Map().set('room', 'livingroom').set('measurement', 'temperature')}]);
      expect(observeCaptor3.getValues()).toEqual([['20°C', new Map().set('room', 'livingroom'), message]]);
    }));

    it('should emit messages inside of the Angular zone', fakeAsync(() => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic
      let receivedMessageInsideAngularZone;
      solaceMessageClient.observe$('topic').subscribe(() => {
        receivedMessageInsideAngularZone = NgZone.isInAngularZone();
      });
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving a message from the Solace broker
      const message = createTopicMessage('topic');
      simulateTopicMessage(message);

      expect(receivedMessageInsideAngularZone).toBeTrue();
    }));

    it('should publish a message as binary message (by default)', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message.getBinaryAttachment()).toEqual('payload');
    }));

    it('should allow publishing a message as structured text message (SDT Structured Data Type)', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createSDTField(SDTFieldType.STRING, 'payload'))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.TEXT);
      expect(sessionSendCaptor.message.getSdtContainer().getValue()).toEqual('payload');
    }));

    it('should allow publishing a message as structured map message (SDT Structured Data Type)', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      const mapContainer = SolaceObjectFactory.createSDTMapContainer();
      mapContainer.addField('key', SDTFieldType.STRING, 'value');
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createSDTField(SDTFieldType.MAP, mapContainer))).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.MAP);
      expect(sessionSendCaptor.message.getSdtContainer().getValue()).toEqual(mapContainer);
    }));

    it('should allow publishing a message as given', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      const message = SolaceObjectFactory.createMessage();
      message.setCorrelationId('123');
      await expectAsync(solaceMessageClient.publish('topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
    }));

    it('should ignore the topic set on the message', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      const message = SolaceObjectFactory.createMessage();
      message.setDestination(SolaceObjectFactory.createTopicDestination('message-topic'));
      await expectAsync(solaceMessageClient.publish('publish-topic', message)).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('publish-topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message).toBe(message);
    }));

    it('should allow intercepting the message before sent over the network', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic', 'payload', {
        intercept: msg => {
          msg.setPriority(123);
        },
      })).toBeResolved();

      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.topic).toEqual('topic');
      expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
    }));

    it('should publish a message as direct message (by default)', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // publish the message
      await expectAsync(solaceMessageClient.publish('topic')).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
    }));

    it('should allow controlling publishing of the message', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      const sessionSendCaptor = installSessionSendCaptor();
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const publishOptions: PublishOptions = {
        deliveryMode: MessageDeliveryModeType.PERSISTENT,
        dmqEligible: true,
        correlationId: '123',
        priority: 123,
        timeToLive: 123,
      };

      // publish binary message
      await expectAsync(solaceMessageClient.publish('topic', 'blubber', publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.PERSISTENT);
      expect(sessionSendCaptor.message.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message.getTimeToLive()).toEqual(123);

      // publish a Solace message
      session.send.calls.reset();
      await expectAsync(solaceMessageClient.publish('topic', SolaceObjectFactory.createMessage(), publishOptions)).toBeResolved();
      expect(session.send).toHaveBeenCalledTimes(1);
      expect(sessionSendCaptor.message.getDeliveryMode()).toEqual(MessageDeliveryModeType.PERSISTENT);
      expect(sessionSendCaptor.message.isDMQEligible()).toBeTrue();
      expect(sessionSendCaptor.message.getCorrelationId()).toEqual('123');
      expect(sessionSendCaptor.message.getPriority()).toEqual(123);
      expect(sessionSendCaptor.message.getTimeToLive()).toEqual(123);
    }));

    it('should map a structured text message into its textual representation', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();
      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving message published to 'myhome/kitchen/temperature'
      const message = createTopicMessage('myhome/kitchen/temperature');
      message.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, 'textual-payload'));
      simulateTopicMessage(message);

      await observeCaptor.waitUntilEmitCount(1);
      expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['textual-payload', new Map().set('room', 'kitchen'), message]]);
    }));

    it('should map a binary message into its binary representation', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'myhome/:room/temperature'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<[string, Params, Message]>();

      solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToBinary()).subscribe(observeCaptor);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // Simulate receiving message published to 'myhome/kitchen/temperature'
      const message = createTopicMessage('myhome/kitchen/temperature');
      message.setBinaryAttachment('binary');
      simulateTopicMessage(message);

      expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['binary', new Map().set('room', 'kitchen'), message]]);
    }));

    it('should complete subscription Observables when disconnecting from the broker', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor();

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      await solaceMessageClient.disconnect();
      expect(observeCaptor.hasCompleted()).toBeTrue();
    }));

    it('should destroy the Solace session when disconnecting from the broker', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      await solaceMessageClient.disconnect();

      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
    }));

    it('should clear Solace subscription registry when disconnecting from the broker', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to 'topic'
      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
      session.subscribe.calls.reset();
      sessionSubscribeCaptor.reset();

      // Disconnect
      await solaceMessageClient.disconnect();

      // Connect
      const connected = solaceMessageClient.connect({url: 'some-url', vpnName: 'some-vpn'});
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);
      await connected;

      // Subscribe again to 'topic', but after a re-connect, expecting a new subscription to be created
      solaceMessageClient.observe$('topic').subscribe();
      flushMicrotasks();
      expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout*/);
    }));

    it('should not cancel Solace subscriptions but complete Observables when the Solace session died (e.g. network interruption, with the max reconnect count exceeded)', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();

      // Simulate the connection to be permanently down
      simulateLifecycleEvent(solace.SessionEventCode.DOWN_ERROR);

      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);

      // Assert that we do not unsubscribe from the session upon a session down event. Otherwise, solclientjs would enter an invalid state and crash.
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeTrue();
    }));

    it('should not cancel Solace subscriptions nor complete Observables in case of a connection lost while the retry mechanism is in progress', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();

      // Simulate connection interruption
      simulateLifecycleEvent(solace.SessionEventCode.RECONNECTING_NOTICE);
      session.subscribe.calls.reset();

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();

      // Simulate connection reconnected
      simulateLifecycleEvent(solace.SessionEventCode.RECONNECTED_NOTICE);

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();
    }));

    it('should not cancel Solace subscriptions but complete Observables when exceeding the maximal retry count limit upon a connection lost', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      // Subscribe to a topic
      const observeCaptor = new ObserveCaptor(extractMessage);

      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      flushMicrotasks();

      // Simulate connection interruption
      simulateLifecycleEvent(solace.SessionEventCode.RECONNECTING_NOTICE);
      session.subscribe.calls.reset();

      expect(session.dispose).toHaveBeenCalledTimes(0);
      expect(session.disconnect).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeFalse();

      // Simulate maximal retry count limit exceeded
      simulateLifecycleEvent(solace.SessionEventCode.DOWN_ERROR);

      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(session.disconnect).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(observeCaptor.hasCompleted()).toBeTrue();
    }));

    it('should subscribe sequentially', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();

      // subscribe to `topic 1`
      solaceMessageClient.observe$('topic-1').subscribe();
      flushMicrotasks();

      // subscribe to `topic 2`
      solaceMessageClient.observe$('topic-2').subscribe();
      flushMicrotasks();

      // subscribe to `topic 3`
      const topic3SubscribeCaptor = new ObserveCaptor();
      solaceMessageClient.observe$('topic-3').subscribe(topic3SubscribeCaptor);
      flushMicrotasks();

      // subscribe to `topic 4`
      solaceMessageClient.observe$('topic-4').subscribe();
      flushMicrotasks();

      // expect single call to `session.subscribe` for subscription of `topic-1`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-1`
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-2`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate confirmation of subscription for topic `topic-2`
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` for subscription of `topic-3`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();

      // simulate error confirmation of subscription for topic `topic-3`
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
      expect(topic3SubscribeCaptor.hasErrored()).toBeTrue();

      // expect single call to `session.subscribe` for subscription of `topic-4`
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-4'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      flushMicrotasks();
    }));

    it('should subscribe and unsubscribe sequentially on the same topic', fakeAsync(async () => {
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      simulateLifecycleEvent(solace.SessionEventCode.UP_NOTICE);

      const sessionSubscribeCaptor = installSessionSubscribeCaptor();
      const sessionUnsubscribeCaptor = installSessionUnsubscribeCaptor();

      // subscribe to `topic`
      const subscription1 = solaceMessageClient.observe$('topic').subscribe();
      flushMicrotasks();

      // unsubscribe from `topic` (Solace confirmation is pending)
      subscription1.unsubscribe();
      flushMicrotasks();

      // subscribe to `topic` (Solace confirmations are pending)
      const subscription2 = solaceMessageClient.observe$('topic').subscribe();
      flushMicrotasks();

      // unsubscribe from `topic` (Solace confirmations are pending)
      subscription2.unsubscribe();
      flushMicrotasks();

      // expect single call to `session.subscribe` (subscription 1)
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 1
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 1)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of unsubscription 1
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

      // expect single call to `session.subscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledTimes(0);
      expect(session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();

      // simulate confirmation of subscription 2
      simulateLifecycleEvent(solace.SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

      // expect single call to `session.unsubscribe` (subscription 2)
      expect(session.subscribe).toHaveBeenCalledTimes(0);
      expect(session.unsubscribe).toHaveBeenCalledTimes(1);
      expect(session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout*/);
      session.subscribe.calls.reset();
      session.unsubscribe.calls.reset();
    }));
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace session.
   */
  function simulateTopicMessage(message: Message): void {
    const callback = sessionEventCallbacks.get(solace.SessionEventCode.MESSAGE);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${solace.SessionEventCode.MESSAGE}'`);
    }
    callback && callback(message);
    flushMicrotasks();
  }

  /**
   * Simulates the Solace message broker to send a message to the Solace session.
   */
  function simulateLifecycleEvent(eventCode: solace.SessionEventCode, correlationKey?: string): void {
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
    flushMicrotasks();
  }

  function createTopicMessage(topic: string): Message {
    const message = SolaceObjectFactory.createMessage();
    message.setDestination(SolaceObjectFactory.createTopicDestination(topic));
    return message;
  }

  /**
   * Captures the most recent invocation to {@link solace.Session.subscribe}.
   */
  function installSessionSubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    session.subscribe.and.callFake((topic: solace.Destination, requestConfirmation: boolean, correlationKey: string, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link solace.Session.unsubscribe}.
   */
  function installSessionUnsubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    session.unsubscribe.and.callFake((topic: solace.Destination, requestConfirmation: boolean, correlationKey: string, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link solace.Session.send}.
   */
  function installSessionSendCaptor(): SessionSendCaptor {
    const captor = new SessionSendCaptor();
    session.send.and.callFake((message: Message) => {
      captor.message = message;
      captor.topic = message.getDestination().getName();
      captor.type = message.getType();
    });
    return captor;
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
  public topic: string;
  public type: MessageType;

  public resset(): void {
    this.message = undefined;
    this.topic = undefined;
    this.type = undefined;
  }
}

function extractMessage(envelope: MessageEnvelope): Message {
  return envelope.message;
}
