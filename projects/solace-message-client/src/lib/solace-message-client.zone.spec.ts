import {SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createTopicMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient (zone)', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
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
});
