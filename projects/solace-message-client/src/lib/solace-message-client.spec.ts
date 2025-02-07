import {mapToBinary, mapToText, MessageEnvelope, Params, PublishOptions, SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {Component, NgZone} from '@angular/core';
import {DestinationType, Message, MessageDeliveryModeType, MessageType, SDTField, SDTFieldType, SDTMapContainer, SessionEventCode, SolclientFactory} from 'solclientjs';
import {UUID} from '@scion/toolkit/uuid';
import {SessionFixture} from './testing/session.fixture';
import {createTopicMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  it('should not eagerly construct `SolaceMessageClient`', async () => {
    @Component({
      selector: 'spec-component',
      template: '',
    })
    class SpecComponent {
    }

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(new SessionFixture()),
        {
          provide: SolaceMessageClient,
          useFactory: () => {
            throw Error('SolaceMessageClient should not be constructed eagerly.');
          },
        },
      ],
    });
    expect(() => TestBed.createComponent(SpecComponent)).not.toThrowError();
  });

  it('should reject the Session Promise when the connect attempt fails', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.CONNECT_FAILED_ERROR);

    await expectAsync(solaceMessageClient.session).toBeRejected();
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
  });

  it('should allow to disconnect and re-connect from the Solace message broker', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    sessionFixture.session.connect.calls.reset();
    sessionFixture.sessionProvider.provide.calls.reset();

    // Disconnect
    await solaceMessageClient.disconnect();
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(1);
    sessionFixture.session.dispose.calls.reset();
    sessionFixture.session.disconnect.calls.reset();

    // Connect
    const connected = solaceMessageClient.connect({url: 'other-url', vpnName: 'other-vpn'});
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await expectAsync(solaceMessageClient.session).toBeResolved();

    await connected;
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'other-url', vpnName: 'other-vpn'}));
  });

  it('should clear pending subscriptions when the connection goes down', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic-1 (success)
    solaceMessageClient.observe$('topic-1').subscribe();
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Subscribe to topic-2 (pending confirmation)
    solaceMessageClient.observe$('topic-2').subscribe();

    // Simulate the connection to be permanently down
    await sessionFixture.simulateEvent(SessionEventCode.DOWN_ERROR);

    // Reconnect to the broker
    const connected = solaceMessageClient.connect({url: 'other-url', vpnName: 'other-vpn'});
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await expectAsync(connected).toBeResolved();
    sessionFixture.session.subscribe.calls.reset();

    // Subscribe to topic-3 (success)
    solaceMessageClient.observe$('topic-3').subscribe();
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
  });

  it('should create a single subscription per topic on the Solace session', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const sessionUnsubscribeCaptor = sessionFixture.installSessionUnsubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic-1
    const subscription1 = solaceMessageClient.observe$('topic-1').subscribe();
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionFixture.session.subscribe.calls.reset();
    sessionSubscribeCaptor.reset();

    // Subscribe again to topic-1
    const subscription2 = solaceMessageClient.observe$('topic-1').subscribe();
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(0);
    sessionFixture.session.subscribe.calls.reset();
    sessionSubscribeCaptor.reset();

    // Subscribe again to topic-1
    const subscription3 = solaceMessageClient.observe$('topic-1').subscribe();
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeUndefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(0);
    sessionFixture.session.subscribe.calls.reset();
    sessionSubscribeCaptor.reset();

    // Subscribe to topic-2
    const subscription4 = solaceMessageClient.observe$('topic-2').subscribe();
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionFixture.session.subscribe.calls.reset();
    sessionSubscribeCaptor.reset();

    // Unsubscribe from topic-1 (subscription 1)
    subscription1.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);

    // Unsubscribe from topic-1 (subscription 3)
    subscription3.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);

    // Unsubscribe from topic-1 (subscription 2)
    subscription2.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    sessionFixture.session.unsubscribe.calls.reset();
    sessionUnsubscribeCaptor.reset();

    // Unsubscribe from topic-2 (subscription 4)
    subscription4.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
  });

  it('should error when failing to subscribe to a topic on the Solace session', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const observeCaptor = new ObserveCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    const subscription = solaceMessageClient.observe$('topic').subscribe(observeCaptor);
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

    // Simulate the subscription to fail
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);

    // Expect the Observable to error
    expect(observeCaptor.hasErrored()).toEqual(true);
    expect(observeCaptor.hasCompleted()).toEqual(false);
    expect(subscription.closed).toEqual(true);

    // Expect that SolaceMessageClient did not invoke unsubscribe
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
  });

  it('should subscribe to a topic on the Solace session even if a previous subscription for the same topic failed', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const sessionUnsubscribeCaptor = sessionFixture.installSessionUnsubscribeCaptor();
    const observeCaptor = new ObserveCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);
    await drainMicrotaskQueue();

    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

    // Simulate the subscription to error
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasErrored()).toBeTrue();

    // Reset mock invocations
    sessionSubscribeCaptor.reset();
    sessionFixture.session.subscribe.calls.reset();
    sessionFixture.session.unsubscribe.calls.reset();

    // Subscribe to the topic anew
    const subscription = solaceMessageClient.observe$('topic').subscribe();
    await drainMicrotaskQueue();

    // Expect the SolaceMessageClient to invoke subscribe on the Solace session for that topic
    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);

    // Simulate the subscription to succeed
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    sessionFixture.session.unsubscribe.calls.reset();

    // Unsubscribe from the topic
    subscription.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
  });

  it('should not unsubscribe more specific topics when unsubscribing from a wildcard topic', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const sessionUnsubscribeCaptor = sessionFixture.installSessionUnsubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic 'myhome/*/temperature'
    const observeCaptor1 = new ObserveCaptor(extractMessage);
    const wildcardSubscription = solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    // Subscribe to topic 'myhome/livingroom/kitchen'
    const observeCaptor2 = new ObserveCaptor(extractMessage);
    const exactSubscription = solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(observeCaptor2);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    // Simulate receiving message published to 'myhome/livingroom/kitchen'
    const message1 = createTopicMessage('myhome/livingroom/temperature');
    await sessionFixture.simulateMessage(message1);
    expect(observeCaptor1.getValues()).toEqual([message1]); // topic: myhome/*/temperature
    expect(observeCaptor2.getValues()).toEqual([message1]); // topic: myhome/livingroom/temperature

    observeCaptor1.reset();
    observeCaptor2.reset();

    // Unsubscribe wildcard subscription
    wildcardSubscription.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/*/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    sessionUnsubscribeCaptor.reset();

    // Simulate receiving message published to 'myhome/livingroom/temperature'
    const message2 = createTopicMessage('myhome/livingroom/temperature');
    await sessionFixture.simulateMessage(message2);
    expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
    expect(observeCaptor2.getValues()).toEqual([message2]); // topic: myhome/livingroom/temperature

    observeCaptor1.reset();
    observeCaptor2.reset();
    sessionFixture.session.unsubscribe.calls.reset();

    // Unsubscribe exact subscription
    exactSubscription.unsubscribe();
    await drainMicrotaskQueue();
    expect(sessionUnsubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'myhome/livingroom/temperature'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    // Simulate receiving message published to 'myhome/livingroom/temperature'
    const message3 = createTopicMessage('myhome/livingroom/temperature');
    await sessionFixture.simulateMessage(message3);
    expect(observeCaptor1.getValues()).toEqual([]); // topic: myhome/*/temperature
    expect(observeCaptor2.getValues()).toEqual([]); // topic: myhome/livingroom/temperature
  });

  it('should receive messages sent to a topic', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const sessionUnsubscribeCaptor = sessionFixture.installSessionUnsubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic-1
    const observeCaptor1_topic1 = new ObserveCaptor(extractMessage);

    const subscription1_topic1 = solaceMessageClient.observe$('topic-1').subscribe(observeCaptor1_topic1);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message1 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message1);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1]);

    // Simulate receiving a message from the Solace broker
    const message2 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message2);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

    // Simulate receiving a message from the Solace broker
    const message3 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message3);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2]);

    // Subscribe to topic-2
    const observeCaptor2_topic2 = new ObserveCaptor(extractMessage);
    const subscription2_topic2 = solaceMessageClient.observe$('topic-2').subscribe(observeCaptor2_topic2);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message4 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message4);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
    expect(observeCaptor2_topic2.getValues()).toEqual([]);

    // Simulate receiving a message from the Solace broker
    const message5 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message5);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5]);

    // Simulate receiving a message from the Solace broker
    const message6 = createTopicMessage('topic-3');
    await sessionFixture.simulateMessage(message6);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5]);

    // Subscribe to topic-2 anew
    const observeCaptor3_topic2 = new ObserveCaptor(extractMessage);
    const subscription3_topic2 = solaceMessageClient.observe$('topic-2').subscribe(observeCaptor3_topic2);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message7 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message7);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5]);
    expect(observeCaptor3_topic2.getValues()).toEqual([]);

    // Simulate receiving a message from the Solace broker
    const message8 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message8);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message9 = createTopicMessage('topic-3');
    await sessionFixture.simulateMessage(message9);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Unsubscribe subscription 3 (topic-2)
    subscription3_topic2.unsubscribe();
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message10 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message10);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message11 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message11);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message12 = createTopicMessage('topic-3');
    await sessionFixture.simulateMessage(message12);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Unsubscribe subscription 1 (topic-1)
    subscription1_topic1.unsubscribe();
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message13 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message13);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message14 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message14);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message15 = createTopicMessage('topic-3');
    await sessionFixture.simulateMessage(message15);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Unsubscribe subscription 2 (topic-2)
    subscription2_topic2.unsubscribe();
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message16 = createTopicMessage('topic-1');
    await sessionFixture.simulateMessage(message16);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message17 = createTopicMessage('topic-2');
    await sessionFixture.simulateMessage(message17);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);

    // Simulate receiving a message from the Solace broker
    const message18 = createTopicMessage('topic-3');
    await sessionFixture.simulateMessage(message18);
    expect(observeCaptor1_topic1.getValues()).toEqual([message1, message2, message4, message7, message10]);
    expect(observeCaptor2_topic2.getValues()).toEqual([message5, message8, message11, message14]);
    expect(observeCaptor3_topic2.getValues()).toEqual([message8]);
  });

  it('should receive messages in the zone subscribed (inside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe inside the Angular zone.
    TestBed.inject(NgZone).run(() => solaceMessageClient.observe$('topic').subscribe(observeCaptor));

    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    await sessionFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received inside the Angular zone
    expect(observeCaptor.getValues()).toEqual([true]);
  });

  it('should receive messages in the zone subscribed (outside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe outside the Angular zone.
    TestBed.inject(NgZone).runOutsideAngular(() => solaceMessageClient.observe$('topic').subscribe(observeCaptor));

    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    await sessionFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received outside the Angular zone
    expect(observeCaptor.getValues()).toEqual([false]);
  });

  it('should allow wildcard subscriptions', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    const observeCaptor1 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/*/temperature').subscribe(observeCaptor1);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    const observeCaptor2 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/*/*').subscribe(observeCaptor2);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    const observeCaptor3 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/>').subscribe(observeCaptor3);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    const observeCaptor4 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/kitchen/*').subscribe(observeCaptor4);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    const observeCaptor5 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/kitchen/temperature/>').subscribe(observeCaptor5);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    const observeCaptor6 = new ObserveCaptor(extractMessage);
    solaceMessageClient.observe$('myhome/floor4/kitchen/temperature/celsius').subscribe(observeCaptor6);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionSubscribeCaptor.reset();

    // Simulate receiving a message from the Solace broker
    let message = createTopicMessage('myhome/livingroom/temperature');
    await sessionFixture.simulateMessage(message);
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
    await sessionFixture.simulateMessage(message);
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
    await sessionFixture.simulateMessage(message);
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
    await sessionFixture.simulateMessage(message);
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
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    const observeCaptor1 = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.observe$('myhome/:room/temperature').subscribe(observeCaptor1);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    const observeCaptor2 = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.observe$('myhome/:room/:measurement').subscribe(observeCaptor2);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    const observeCaptor3 = new ObserveCaptor<[string, Params, Message]>();
    solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor3);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving a message from the Solace broker
    const message = createTopicMessage('myhome/livingroom/temperature');
    message.setSdtContainer(SDTField.create(SDTFieldType.STRING, '20°C'));

    await sessionFixture.simulateMessage(message);
    expect(observeCaptor1.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom')})]);
    expect(observeCaptor2.getValues()).toEqual([jasmine.objectContaining({message, params: new Map().set('room', 'livingroom').set('measurement', 'temperature')})]);
    expect(observeCaptor3.getValues()).toEqual([['20°C', new Map().set('room', 'livingroom'), message]]);
  });

  it('should notify when subscribed to topic destination', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic
    const onSubscribedCallback1 = jasmine.createSpy('onSubscribed');
    solaceMessageClient.observe$('topic', {onSubscribed: onSubscribedCallback1}).subscribe();
    await drainMicrotaskQueue();

    // Expect `onSubscribed` callback to be invoked after the receipt of `SUBSCRIPTION_OK` event
    expect(onSubscribedCallback1).toHaveBeenCalledTimes(0);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
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
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic
    const onSubscribedCallback = jasmine.createSpy('onSubscribed');
    solaceMessageClient.observe$('topic', {onSubscribed: onSubscribedCallback}).subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Expect `onSubscribed` callback not to be invoked after the receipt of `SUBSCRIPTION_ERROR` event
    expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
    expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
    expect(messageCaptor.hasErrored()).toBeTrue();
  });

  it('should publish a message to a topic', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message to a topic
    await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.destination!.getType()).toEqual(DestinationType.TOPIC);
  });

  it('should publish a message to a queue', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message to a queue
    await expectAsync(solaceMessageClient.publish(SolclientFactory.createDurableQueueDestination('queue'), 'payload')).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('queue');
    expect(sessionSendCaptor.destination!.getType()).toEqual(DestinationType.QUEUE);
  });

  it('should publish a message as binary message (by default)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    await expectAsync(solaceMessageClient.publish('topic', 'payload')).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
    expect(new TextDecoder().decode(sessionSendCaptor.message!.getBinaryAttachment() as Uint8Array)).toEqual('payload');
  });

  it('should allow publishing a message as structured text message (SDT Structured Data Type)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    await expectAsync(solaceMessageClient.publish('topic', SDTField.create(SDTFieldType.STRING, 'payload'))).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.TEXT);
    expect(sessionSendCaptor.message!.getSdtContainer()!.getValue()).toEqual('payload');
  });

  it('should allow publishing a message as structured map message (SDT Structured Data Type)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    const mapContainer = new SDTMapContainer();
    mapContainer.addField('key', SDTFieldType.STRING, 'value');
    await expectAsync(solaceMessageClient.publish('topic', SDTField.create(SDTFieldType.MAP, mapContainer))).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.MAP);
    expect(sessionSendCaptor.message!.getSdtContainer()!.getValue()).toEqual(mapContainer);
  });

  it('should allow publishing a message as given', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    const message = SolclientFactory.createMessage();
    message.setCorrelationId('123');
    await expectAsync(solaceMessageClient.publish('topic', message)).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
    expect(sessionSendCaptor.message).toBe(message);
    expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
  });

  it('should ignore the topic set on the message', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    const message = SolclientFactory.createMessage();
    message.setDestination(SolclientFactory.createTopicDestination('message-topic'));
    await expectAsync(solaceMessageClient.publish('publish-topic', message)).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('publish-topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
    expect(sessionSendCaptor.message).toBe(message);
  });

  it('should allow intercepting the message before sent over the network', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    await expectAsync(solaceMessageClient.publish('topic', 'payload', {
      intercept: msg => {
        msg.setPriority(123);
      },
    })).toBeResolved();

    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.type).toEqual(MessageType.BINARY);
    expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
  });

  it('should publish a message as direct message (by default)', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // publish the message
    await expectAsync(solaceMessageClient.publish('topic')).toBeResolved();
    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
  });

  it('should allow controlling publishing of the message by passing options', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    const publishOptions: PublishOptions = {
      dmqEligible: true,
      correlationId: '123',
      priority: 123,
      timeToLive: 123,
    };

    // publish binary message
    await expectAsync(solaceMessageClient.publish('topic', 'blubber', publishOptions)).toBeResolved();
    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
    expect(sessionSendCaptor.message!.isDMQEligible()).toBeTrue();
    expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
    expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
    expect(sessionSendCaptor.message!.getTimeToLive()).toEqual(123);

    // publish a Solace message
    sessionFixture.session.send.calls.reset();
    await expectAsync(solaceMessageClient.publish('topic', SolclientFactory.createMessage(), publishOptions)).toBeResolved();
    expect(sessionFixture.session.send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.message!.getDeliveryMode()).toEqual(MessageDeliveryModeType.DIRECT);
    expect(sessionSendCaptor.message!.isDMQEligible()).toBeTrue();
    expect(sessionSendCaptor.message!.getCorrelationId()).toEqual('123');
    expect(sessionSendCaptor.message!.getPriority()).toEqual(123);
    expect(sessionSendCaptor.message!.getTimeToLive()).toEqual(123);
  });

  it('should map a structured text message into its textual representation', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic 'myhome/:room/temperature'
    const observeCaptor = new ObserveCaptor<[string, Params, Message]>();
    solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToText()).subscribe(observeCaptor);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving message published to 'myhome/kitchen/temperature'
    const message = createTopicMessage('myhome/kitchen/temperature');
    message.setSdtContainer(SDTField.create(SDTFieldType.STRING, 'textual-payload'));
    await sessionFixture.simulateMessage(message);

    await observeCaptor.waitUntilEmitCount(1);
    expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['textual-payload', new Map().set('room', 'kitchen'), message]]);
  });

  it('should map a binary message into its binary representation', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to topic 'myhome/:room/temperature'
    const projectBinaryToText = ([binary, params, msg]: [Uint8Array, Params, Message]): [string, Params, Message] => [new TextDecoder().decode(binary), params, msg];
    const observeCaptor = new ObserveCaptor(projectBinaryToText);

    solaceMessageClient.observe$('myhome/:room/temperature').pipe(mapToBinary()).subscribe(observeCaptor);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Simulate receiving message published to 'myhome/kitchen/temperature'
    const message = createTopicMessage('myhome/kitchen/temperature');
    message.setBinaryAttachment('binary');
    await sessionFixture.simulateMessage(message);

    expect<[string, Params, Message]>(observeCaptor.getValues()).toEqual([['binary', new Map().set('room', 'kitchen'), message]]);
  });

  it('should complete subscription Observables when disconnecting from the broker', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic
    const observeCaptor = new ObserveCaptor();

    solaceMessageClient.observe$('topic').subscribe(observeCaptor);
    await drainMicrotaskQueue();
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    await solaceMessageClient.disconnect();
    expect(observeCaptor.hasCompleted()).toBeTrue();
  });

  it('should destroy the Solace session when disconnecting from the broker', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    await solaceMessageClient.disconnect();

    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should clear Solace subscription registry when disconnecting from the broker', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const observeCaptor = new ObserveCaptor(extractMessage);
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to 'topic'
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);
    await drainMicrotaskQueue();
    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);
    sessionFixture.session.subscribe.calls.reset();
    sessionSubscribeCaptor.reset();

    // Disconnect
    await solaceMessageClient.disconnect();

    // Connect
    const connected = solaceMessageClient.connect({url: 'other-url', vpnName: 'other-vpn'});
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await connected;

    // Subscribe again to 'topic', but after a re-connect, expecting a new subscription to be created
    solaceMessageClient.observe$('topic').subscribe();
    await drainMicrotaskQueue();
    expect(sessionSubscribeCaptor.correlationKey).toBeDefined();
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey /* correlationKey */, undefined /* requestTimeout */);
  });

  it('should not cancel Solace subscriptions but complete Observables when the Solace session died (e.g. network interruption, with the max reconnect count exceeded)', async () => {
    const sessionFixture = new SessionFixture();
    const observeCaptor = new ObserveCaptor(extractMessage);
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);

    // Simulate the connection to be permanently down
    await sessionFixture.simulateEvent(SessionEventCode.DOWN_ERROR);

    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);

    // Assert that we do not unsubscribe from the session upon a session down event. Otherwise, solclientjs would enter an invalid state and crash.
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasCompleted()).toBeTrue();
  });

  it('should not cancel Solace subscriptions nor complete Observables in case of a connection lost while the retry mechanism is in progress', async () => {
    const sessionFixture = new SessionFixture();
    const observeCaptor = new ObserveCaptor(extractMessage);
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);

    // Simulate connection interruption
    await sessionFixture.simulateEvent(SessionEventCode.RECONNECTING_NOTICE);
    sessionFixture.session.subscribe.calls.reset();

    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasCompleted()).toBeFalse();

    // Simulate connection reconnected
    await sessionFixture.simulateEvent(SessionEventCode.RECONNECTED_NOTICE);

    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasCompleted()).toBeFalse();
  });

  it('should not cancel Solace subscriptions but complete Observables when exceeding the maximal retry count limit upon a connection lost', async () => {
    const sessionFixture = new SessionFixture();
    const observeCaptor = new ObserveCaptor(extractMessage);
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);
    await drainMicrotaskQueue();

    // Simulate connection interruption
    await sessionFixture.simulateEvent(SessionEventCode.RECONNECTING_NOTICE);
    sessionFixture.session.subscribe.calls.reset();

    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasCompleted()).toBeFalse();

    // Simulate maximal retry count limit exceeded
    await sessionFixture.simulateEvent(SessionEventCode.DOWN_ERROR);

    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(observeCaptor.hasCompleted()).toBeTrue();
  });

  it(`should dispose the Solace session but not invoke 'solace.session.disconnect()' when the connection goes irreparably down`, async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Simulate the connection goes irreparably down
    await sessionFixture.simulateEvent(SessionEventCode.DOWN_ERROR);

    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0); // not invoked as already disconnected with the router
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
  });

  it(`should invoke 'solace.session.dispose()' but not 'solace.session.disconnect()' when receiving DISCONNECT confirmation event`, async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Simulate the session to be disconnected
    await sessionFixture.simulateEvent(SessionEventCode.DISCONNECTED);

    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
  });

  it(`should invoke 'solace.session.dispose()' only when received DISCONNECT confirmation event from the broker`, async () => {
    const sessionFixture = new SessionFixture();
    sessionFixture.disableFiringDownEventOnDisconnect();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Disconnect
    let resolved = false;
    const whenDisconnected = solaceMessageClient.disconnect().then(() => resolved = true);
    await drainMicrotaskQueue();

    expect(sessionFixture.session.disconnect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(0);
    expect(resolved).toBeFalse();

    // Simulate the session to be disconnected
    await sessionFixture.simulateEvent(SessionEventCode.DISCONNECTED);
    await expectAsync(whenDisconnected).toBeResolved();
    expect(sessionFixture.session.dispose).toHaveBeenCalledTimes(1);
    expect(resolved).toBeTrue();
  });

  it('should subscribe sequentially', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

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
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-1'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();

    // simulate confirmation of subscription for topic `topic-1`
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // expect single call to `session.subscribe` for subscription of `topic-2`
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-2'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();

    // simulate confirmation of subscription for topic `topic-2`
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // expect single call to `session.subscribe` for subscription of `topic-3`
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-3'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();

    // simulate error confirmation of subscription for topic `topic-3`
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_ERROR, sessionSubscribeCaptor.correlationKey);
    expect(topic3SubscribeCaptor.hasErrored()).toBeTrue();

    // expect single call to `session.subscribe` for subscription of `topic-4`
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic-4'}), true /* requestConfirmation */, jasmine.any(String), undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();
    await drainMicrotaskQueue();
  });

  it('should subscribe and unsubscribe sequentially on the same topic', async () => {
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
    const sessionUnsubscribeCaptor = sessionFixture.installSessionUnsubscribeCaptor();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

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
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();
    sessionFixture.session.unsubscribe.calls.reset();

    // simulate confirmation of subscription 1
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // expect single call to `session.unsubscribe` (subscription 1)
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();
    sessionFixture.session.unsubscribe.calls.reset();

    // simulate confirmation of unsubscription 1
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionUnsubscribeCaptor.correlationKey);

    // expect single call to `session.subscribe` (subscription 2)
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.subscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionSubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();
    sessionFixture.session.unsubscribe.calls.reset();

    // simulate confirmation of subscription 2
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // expect single call to `session.unsubscribe` (subscription 2)
    expect(sessionFixture.session.subscribe).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.unsubscribe).toHaveBeenCalledWith(jasmine.objectContaining({name: 'topic'}), true /* requestConfirmation */, sessionUnsubscribeCaptor.correlationKey, undefined /* requestTimeout */);
    sessionFixture.session.subscribe.calls.reset();
    sessionFixture.session.unsubscribe.calls.reset();
  });

  describe('Guraranteed Messaging', () => {
    it('should resolve the "Publish Promise" when the broker acknowledges the message', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      const correlationKey = UUID.randomUUID();
      let resolved = false;
      const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.PERSISTENT, correlationKey}).then(() => resolved = true);
      await drainMicrotaskQueue();
      expect(resolved).toBeFalse();

      await sessionFixture.simulateEvent(SessionEventCode.ACKNOWLEDGED_MESSAGE, correlationKey);
      expect(resolved).toBeTrue();
      await expectAsync(whenPublished).toBeResolved();
    });

    it('should reject the "Publish Promise" when the broker rejects the message', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      const correlationKey = UUID.randomUUID();
      let resolved = false;
      const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.PERSISTENT, correlationKey}).then(() => resolved = true);
      await drainMicrotaskQueue();
      expect(resolved).toBeFalse();

      await sessionFixture.simulateEvent(SessionEventCode.REJECTED_MESSAGE_ERROR, correlationKey);
      expect(resolved).toBeFalse();
      await expectAsync(whenPublished).toBeRejected();
    });
  });

  describe('Direct Messaging', () => {
    it('should resolve the "Publish Promise" immediately', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      const whenPublished = solaceMessageClient.publish('topic', 'payload', {deliveryMode: MessageDeliveryModeType.DIRECT});
      await drainMicrotaskQueue();
      await expectAsync(whenPublished).toBeResolved();
    });
  });

  describe('Message Headers', () => {

    it('should publish message headers (user properties)', async () => {
      const sessionFixture = new SessionFixture();
      const sessionSendCaptor = sessionFixture.installSessionSendCaptor();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

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
      const sessionFixture = new SessionFixture();
      const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();
      const observeCaptor = new ObserveCaptor<MessageEnvelope>();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Subscribe to topic 'topic'
      solaceMessageClient.observe$('topic').subscribe(observeCaptor);
      await drainMicrotaskQueue();
      await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

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

      await sessionFixture.simulateMessage(message);

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
});

function extractMessage(envelope: MessageEnvelope): Message {
  return envelope.message;
}
