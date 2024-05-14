import {MessageEnvelope, SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {MessageConsumerEventName, MessageConsumerProperties, QueueDescriptor, QueueType, SDTFieldType, SDTMapContainer, SessionEventCode, SolclientFactory} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createOperationError, createTopicMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient - Consume', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  it('should connect to a non-durable topic endpoint if passing a topic \'string\' literal', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a non-durable topic endpoint
    solaceMessageClient.consume$('topic').subscribe();
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Expect connected to a non-durable topic endpoint
    expect(messageConsumerFixture.messageConsumerProperties).toEqual({
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
    });
  });

  it('should allow connecting to a durable queue endpoint', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a durable queue endpoint
    const config: MessageConsumerProperties = {
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue', durable: true}),
    };
    solaceMessageClient.consume$(config).subscribe();
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Expect connected to a durable queue endpoint
    expect(messageConsumerFixture.messageConsumerProperties).toEqual({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue', durable: true}),
    });
  });

  it('should allow connecting to a durable topic endpoint', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a durable topic endpoint
    const config: MessageConsumerProperties = {
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true}),
    };
    solaceMessageClient.consume$(config).subscribe();
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Expect connected to a durable topic endpoint
    expect(messageConsumerFixture.messageConsumerProperties).toEqual({
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, name: 'topic-endpoint', durable: true}),
    });
  });

  it('should receive messages', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic endpoint
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.consume$('topic/*').subscribe(messageCaptor);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    const message1 = createTopicMessage('topic/1');
    await messageConsumerFixture.simulateMessage(message1);

    expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({message: message1})]);

    // Simulate to receive another message
    const message2 = createTopicMessage('topic/2');
    await messageConsumerFixture.simulateMessage(message2);

    expect(messageCaptor.getValues()).toEqual([
      jasmine.objectContaining<MessageEnvelope>({message: message1}),
      jasmine.objectContaining<MessageEnvelope>({message: message2}),
    ]);
  });

  // @deprecated since version 17.1.0; Remove when dropping support to configure whether to emit inside or outside the Angular zone.
  it('should receive messages inside the Angular zone', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic endpoint
    solaceMessageClient.consume$({
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
      emitOutsideAngularZone: false,
    }).subscribe(observeCaptor);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    await messageConsumerFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received inside the Angular zone
    expect(observeCaptor.getValues()).toEqual([true]);
  });

  // @deprecated since version 17.1.0; Remove when dropping support to configure whether to emit inside or outside the Angular zone.
  it('should receive messages outside the Angular zone', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const observeCaptor = new ObserveCaptor(() => NgZone.isInAngularZone());
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic endpoint
    solaceMessageClient.consume$({
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
      emitOutsideAngularZone: true,
    }).subscribe(observeCaptor);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    await messageConsumerFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received outside the Angular zone
    expect(observeCaptor.getValues()).toEqual([false]);
  });

  it('should receive messages in the zone subscribed (inside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
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
    TestBed.inject(NgZone).run(() => solaceMessageClient.consume$('topic').subscribe(observeCaptor));

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    await messageConsumerFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received inside the Angular zone
    expect(observeCaptor.getValues()).toEqual([true]);
  });

  it('should receive messages in the zone subscribed (outside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
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
    TestBed.inject(NgZone).runOutsideAngular(() => solaceMessageClient.consume$('topic').subscribe(observeCaptor));

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    await messageConsumerFixture.simulateMessage(createTopicMessage('topic'));

    // Expect message to be received outside the Angular zone
    expect(observeCaptor.getValues()).toEqual([false]);
  });

  it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a non-durable topic endpoint
    solaceMessageClient.consume$('topic').subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Simulate that the connection cannot be established
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR, createOperationError());

    // Expect the Observable to error
    expect(messageCaptor.hasErrored()).toBeTrue();

    // Expect to disconnect from the broker
    expect(messageConsumerFixture.messageConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(messageConsumerFixture.messageConsumer.dispose).toHaveBeenCalledTimes(1);
  });

  it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a non-durable topic endpoint
    solaceMessageClient.consume$('topic').subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate the connection going down
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.DOWN, createOperationError());

    // Expect the Observable to complete
    expect(messageCaptor.hasCompleted()).toBeTrue();
    expect(messageConsumerFixture.messageConsumer.disconnect).toHaveBeenCalledTimes(0);
    expect(messageConsumerFixture.messageConsumer.dispose).toHaveBeenCalledTimes(1);
  });

  it('should gracefully disconnect from the broker when unsubscribing from the Observable', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a non-durable topic endpoint
    const subscription = solaceMessageClient.consume$('topic').subscribe();
    await drainMicrotaskQueue();

    // Expect the message consumer to connect to the broker
    expect(messageConsumerFixture.messageConsumer.connect).toHaveBeenCalledTimes(1);

    // Unsubscribe from the Observable
    messageConsumerFixture.disableFiringDownEventOnDisconnect();
    subscription.unsubscribe();
    await drainMicrotaskQueue();

    // Expect a graceful disconnect
    expect(messageConsumerFixture.messageConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(messageConsumerFixture.messageConsumer.dispose).toHaveBeenCalledTimes(0);

    messageConsumerFixture.messageConsumer.disconnect.calls.reset();

    // Simulate receiving 'MessageConsumerEventName.DOWN' event
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.DOWN);
    expect(messageConsumerFixture.messageConsumer.disconnect).toHaveBeenCalledTimes(0);
    expect(messageConsumerFixture.messageConsumer.dispose).toHaveBeenCalledTimes(1);
  });

  it('should provide substituted values of named wildcard segments', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic endpoint
    solaceMessageClient.consume$('myhome/:room/temperature').subscribe(messageCaptor);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    const message = createTopicMessage('myhome/kitchen/temperature');
    await messageConsumerFixture.simulateMessage(message);

    // Expect params to be contained in the envelope
    expect(messageCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({
      message: message,
      params: new Map().set('room', 'kitchen'),
    })]);
  });

  it('should provide headers contained in the message', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to a topic endpoint
    solaceMessageClient.consume$('topic').subscribe(messageCaptor);

    // Simulate the message consumer to be connected to the broker
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);

    // Simulate to receive a message
    const message = createTopicMessage('topic');
    const userPropertyMap = new SDTMapContainer();
    userPropertyMap.addField('key1', SDTFieldType.STRING, 'value');
    userPropertyMap.addField('key2', SDTFieldType.BOOL, true);
    userPropertyMap.addField('key3', SDTFieldType.INT32, 123);
    message.setUserPropertyMap(userPropertyMap);

    await messageConsumerFixture.simulateMessage(message);

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
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to endoint
    const onSubscribedCallback1 = jasmine.createSpy('onSubscribed');
    solaceMessageClient.consume$({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
      onSubscribed: onSubscribedCallback1,
    }).subscribe();
    await drainMicrotaskQueue();

    // Simulate the message consumer to be connected to the broker
    expect(onSubscribedCallback1).toHaveBeenCalledTimes(0);
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);
    expect(onSubscribedCallback1).toHaveBeenCalledTimes(1);
    expect(onSubscribedCallback1).toHaveBeenCalledWith(messageConsumerFixture.messageConsumer);

    // Subscribe to endpoint anew
    const onSubscribedCallback2 = jasmine.createSpy('onSubscribed');
    solaceMessageClient.consume$({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
      onSubscribed: onSubscribedCallback2,
    }).subscribe();
    await drainMicrotaskQueue();

    // Simulate the message consumer to be connected to the broker
    expect(onSubscribedCallback2).toHaveBeenCalledTimes(0);
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.UP);
    expect(onSubscribedCallback2).toHaveBeenCalledTimes(1);
    expect(onSubscribedCallback2).toHaveBeenCalledWith(messageConsumerFixture.messageConsumer);
  });

  it('should not notify when subscription to endpoint failed', async () => {
    const sessionFixture = new SessionFixture();
    const messageConsumerFixture = sessionFixture.messageConsumerFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Subscribe to endpoint
    const onSubscribedCallback = jasmine.createSpy('onSubscribed');
    solaceMessageClient.consume$({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
      onSubscribed: onSubscribedCallback,
    }).subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Simulate the message consumer to be connected to the broker
    expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
    await messageConsumerFixture.simulateEvent(MessageConsumerEventName.CONNECT_FAILED_ERROR);
    expect(onSubscribedCallback).toHaveBeenCalledTimes(0);
    expect(messageCaptor.hasErrored()).toBeTrue();
  });
});
