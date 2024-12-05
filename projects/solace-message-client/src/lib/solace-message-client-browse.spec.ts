import {MessageEnvelope, SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {QueueBrowserEventName, QueueBrowserProperties, QueueDescriptor, QueueType, SDTFieldType, SDTMapContainer, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createOperationError, createQueueMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient - Browse', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  it('should connect to a queue if passing a queue \'string\' literal', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    solaceMessageClient.browse$('queue').subscribe();
    await drainMicrotaskQueue();

    // Expect the queue browser to connect to the broker
    expect(queueBrowserFixture.queueBrowser.connect).toHaveBeenCalledTimes(1);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Expect connected to the queue browser
    expect(queueBrowserFixture.queueBrowserProperties).toEqual({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
    });
  });

  it('should allow connecting to a queue endpoint passing a config', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    const properties: QueueBrowserProperties = {
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
    };
    solaceMessageClient.browse$(properties).subscribe();
    await drainMicrotaskQueue();

    // Expect the queue browser to connect to the broker
    expect(queueBrowserFixture.queueBrowser.connect).toHaveBeenCalledTimes(1);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Expect connected to the queue browser
    expect(queueBrowserFixture.queueBrowserProperties).toEqual(properties);
  });

  it('should allow browsing messages', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.browse$('queue').subscribe(messageCaptor);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Simulate to receive a message
    const msg1 = createQueueMessage('queue');
    const msg2 = createQueueMessage('queue');
    const msg3 = createQueueMessage('queue');

    await queueBrowserFixture.simulateMessage(msg1);
    await queueBrowserFixture.simulateMessage(msg2);
    await queueBrowserFixture.simulateMessage(msg3);

    expect(messageCaptor.getValues()).toEqual([
      jasmine.objectContaining<MessageEnvelope>({message: msg1}),
      jasmine.objectContaining<MessageEnvelope>({message: msg2}),
      jasmine.objectContaining<MessageEnvelope>({message: msg3}),
    ]);
  });

  it('should receive messages in the zone subscribed (inside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
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
    TestBed.inject(NgZone).run(() => solaceMessageClient.browse$('queue').subscribe(observeCaptor));

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Simulate to receive a message
    await queueBrowserFixture.simulateMessage(createQueueMessage('queue'));

    // Expect message to be received inside the Angular zone
    expect(observeCaptor.getValues()).toEqual([true]);
  });

  it('should receive messages in the zone subscribed (outside Angular)', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
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
    TestBed.inject(NgZone).runOutsideAngular(() => solaceMessageClient.browse$('queue').subscribe(observeCaptor));

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Simulate to receive a message
    await queueBrowserFixture.simulateMessage(createQueueMessage('queue'));

    // Expect message to be received outside the Angular zone
    expect(observeCaptor.getValues()).toEqual([false]);
  });

  it('should start the queue browser when connected to the broker (UP)', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    solaceMessageClient.browse$('queue').subscribe();
    await drainMicrotaskQueue();

    // Expect the queue browser to connect to the broker
    expect(queueBrowserFixture.queueBrowser.connect).toHaveBeenCalledTimes(1);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP, createOperationError());

    // Expect the queue browser to be started
    expect(queueBrowserFixture.queueBrowser.start).toHaveBeenCalledTimes(1);
  });

  it('should error on connection error (CONNECT_FAILED_ERROR)', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    solaceMessageClient.browse$('queue').subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Expect the queue browser to connect to the broker
    expect(queueBrowserFixture.queueBrowser.connect).toHaveBeenCalledTimes(1);

    // Simulate that the connection cannot be established
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.CONNECT_FAILED_ERROR, createOperationError());

    // Expect the Observable to error
    expect(messageCaptor.hasErrored()).toBeTrue();

    // Expect to disconnect from the broker
    expect(queueBrowserFixture.queueBrowser.stop).toHaveBeenCalledTimes(1);
    expect(queueBrowserFixture.queueBrowser.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should complete the Observable when the connection goes down (DOWN), e.g., after a successful session disconnect', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    solaceMessageClient.browse$('queue').subscribe(messageCaptor);
    await drainMicrotaskQueue();

    // Expect the queue browser to connect to the broker
    expect(queueBrowserFixture.queueBrowser.connect).toHaveBeenCalledTimes(1);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Simulate connection going down
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.DOWN, createOperationError());

    // Expect the Observable to complete
    expect(messageCaptor.hasCompleted()).toBeTrue();
  });

  it('should provide headers contained in the message', async () => {
    const sessionFixture = new SessionFixture();
    const queueBrowserFixture = sessionFixture.queueBrowserFixture;
    const messageCaptor = new ObserveCaptor<MessageEnvelope>();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Connect to the queue browser
    solaceMessageClient.browse$('queue').subscribe(messageCaptor);

    // Simulate the queue browser to be connected to the broker
    await queueBrowserFixture.simulateEvent(QueueBrowserEventName.UP);

    // Simulate to receive a message
    const message = createQueueMessage('queue');
    const userPropertyMap = new SDTMapContainer();
    userPropertyMap.addField('key1', SDTFieldType.STRING, 'value');
    userPropertyMap.addField('key2', SDTFieldType.BOOL, true);
    userPropertyMap.addField('key3', SDTFieldType.INT32, 123);
    message.setUserPropertyMap(userPropertyMap);

    await queueBrowserFixture.simulateMessage(message);

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
