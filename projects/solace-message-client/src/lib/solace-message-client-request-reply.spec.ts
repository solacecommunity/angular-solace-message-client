import {MessageEnvelope, SolaceMessageClient} from './solace-message-client';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {TestBed} from '@angular/core/testing';
import {NgZone} from '@angular/core';
import {SessionEventCode, SolclientFactory} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {createRequestError, createTopicMessage, drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';

describe('SolaceMessageClient - Request Reply', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  describe('SolaceMessageClient#request$', () => {
    it('should emit the reply and then complete', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      const replyCaptor = new ObserveCaptor<MessageEnvelope>();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send a request
      solaceMessageClient.request$('topic').subscribe(replyCaptor);
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      const reply = createTopicMessage('reply');
      await sendRequestFixture.simulateReply(reply);

      expect(sessionFixture.session.sendRequest).toHaveBeenCalledTimes(1);
      expect(replyCaptor.getValues()).toEqual([jasmine.objectContaining<MessageEnvelope>({message: reply})]);
      expect(replyCaptor.hasCompleted()).toBeTrue();
    });

    it('should error when the request failed (1/2)', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      const replyCaptor = new ObserveCaptor<MessageEnvelope>();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send a request
      solaceMessageClient.request$('topic').subscribe(replyCaptor);
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      const error = createRequestError();
      await sendRequestFixture.simulateError(error);

      expect(sessionFixture.session.sendRequest).toHaveBeenCalledTimes(1);
      expect(replyCaptor.getValues()).toEqual([]);
      expect(replyCaptor.hasErrored()).toBeTrue();
      expect(replyCaptor.getError()).toBe(error);
    });

    it('should error when the request failed (2/2)', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      const replyCaptor = new ObserveCaptor<MessageEnvelope>();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      sendRequestFixture.throwErrorOnSend = true;

      // Send a request
      solaceMessageClient.request$('topic').subscribe(replyCaptor);
      await drainMicrotaskQueue();

      expect(sessionFixture.session.sendRequest).toHaveBeenCalledTimes(1);
      expect(replyCaptor.getValues()).toEqual([]);
      expect(replyCaptor.hasErrored()).toBeTrue();
    });

    // @deprecated since version 17.1.0; Remove when dropping support to configure whether to emit inside or outside the Angular zone.
    it('should emit inside Angular', async () => {
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

      // Send a request
      solaceMessageClient.request$('topic', undefined, {emitOutsideAngularZone: false}).subscribe(zoneCaptor);
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      await sendRequestFixture.simulateReply(createTopicMessage('reply'));

      expect(zoneCaptor.getValues()).toEqual([true]);
    });

    // @deprecated since version 17.1.0; Remove when dropping support to configure whether to emit inside or outside the Angular zone.
    it('should emit outside Angular', async () => {
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

      // Send a request
      solaceMessageClient.request$('topic', undefined, {emitOutsideAngularZone: true}).subscribe(zoneCaptor);
      await drainMicrotaskQueue();

      // Simulate to receive a reply
      await sendRequestFixture.simulateReply(createTopicMessage('reply'));

      expect(zoneCaptor.getValues()).toEqual([false]);
    });

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

    it('should send the request to the specified topic', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send a request
      solaceMessageClient.request$('topic').subscribe();
      await drainMicrotaskQueue();

      expect(sendRequestFixture.requestMessage!.getDestination()).toEqual(SolclientFactory.createTopicDestination('topic'));
    });

    it('should send the request to the specified queue', async () => {
      const sessionFixture = new SessionFixture();
      const sendRequestFixture = sessionFixture.sendRequestFixture;
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      // Send a request
      solaceMessageClient.request$(SolclientFactory.createDurableQueueDestination('queue')).subscribe();
      await drainMicrotaskQueue();

      expect(sendRequestFixture.requestMessage!.getDestination()).toEqual(SolclientFactory.createDurableQueueDestination('queue'));
    });
  });

  describe('SolaceMessageClient#reply', () => {
    it('should send the reply', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });
      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

      const requestMessage = SolclientFactory.createMessage();
      await solaceMessageClient.reply(requestMessage, 'reply');

      const replyMessage = SolclientFactory.createMessage();
      replyMessage.setBinaryAttachment('reply');
      expect(sessionFixture.session.sendReply).toHaveBeenCalledOnceWith(requestMessage, replyMessage);
    });
  });
});
