import {SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {MessageConsumerEventName, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createTopicMessage, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient - Consume (zone)', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn').and.callThrough();
    spyOn(console, 'error').and.callThrough();
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
});
