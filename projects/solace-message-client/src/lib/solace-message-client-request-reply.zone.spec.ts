import {MessageEnvelope, SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createTopicMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient - Request Reply (zone)', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn').and.callThrough();
    spyOn(console, 'error').and.callThrough();
  });

  describe('SolaceMessageClient#request$', () => {
    it('should receive reply in the zone subscribed (inside Angular)', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      const zoneCaptor = new ObserveCaptor<MessageEnvelope, boolean>(() => NgZone.isInAngularZone());
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send request inside the Angular zone.
      TestBed.inject(NgZone).run(() => solaceMessageClient.request$('topic').subscribe(zoneCaptor));
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      await sendRequestFixture.simulateReply(createTopicMessage('reply'));

      // Expect reply to be received inside the Angular zone
      expect(zoneCaptor.getValues()).toEqual([true]);
    });

    it('should receive replies in the zone subscribed (outside Angular)', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      const zoneCaptor = new ObserveCaptor<MessageEnvelope, boolean>(() => NgZone.isInAngularZone());
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send request outside the Angular zone.
      TestBed.inject(NgZone).runOutsideAngular(() => solaceMessageClient.request$('topic').subscribe(zoneCaptor));
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      await sendRequestFixture.simulateReply(createTopicMessage('reply'));

      // Expect reply to be received outside the Angular zone
      expect(zoneCaptor.getValues()).toEqual([false]);
    });
  });
});
