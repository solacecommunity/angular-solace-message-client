import {MessageEnvelope, SolaceMessageClient} from './solace-message-client';
import {TestBed} from '@angular/core/testing';
import {SessionEventCode} from 'solclientjs/lib-browser/solclient-full';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {createTopicMessage, initSolclientFactory} from './testing/testing.utils';
import {firstValueFrom, Subject, timer} from 'rxjs';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {SolaceMessageClientConfig} from './solace-message-client.config';
import {ɵSolaceMessageClient} from './ɵsolace-message-client';
import {inject, Injector} from '@angular/core';

describe('SolaceMessageClient Connect', () => {

  beforeEach(() => initSolclientFactory());

  it('should connect to the Solace message broker when injecting `SolaceMessageClient`', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });

    // Wait some time.
    await firstValueFrom(timer(500));

    // Expect no auto connect.
    expect(sessionFixture.session.connect).not.toHaveBeenCalled();

    // Inject Message Client.
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expected connected to the broker.
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should connect with the config passed to `provideSolaceMessageClient`', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });

    // Inject Message Client.
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expected connected to the broker.
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should connect with the config passed to `provideSolaceMessageClient` (config function)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => ({url: 'url', vpnName: 'vpn'})),
        provideSession(sessionFixture),
      ],
    });

    // Inject Message Client.
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expected connected to the broker.
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should invoke config function passed to `provideSolaceMessageClient` in injection context', async () => {
    let injector: Injector | undefined;

    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => {
          injector = inject(Injector);
          return {url: 'url', vpnName: 'vpn'};
        }),
        provideSession(sessionFixture),
      ],
    });

    // Inject Message Client.
    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(injector).toBeDefined();
  });

  it('should connect with the config passed to `provideSolaceMessageClient` (async config function)', async () => {
    const config$ = new Subject<SolaceMessageClientConfig>();
    const sessionFixture = new SessionFixture();

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => config$),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);

    // Wait some time.
    await firstValueFrom(timer(500));

    // Expect not connected to the broker yet.
    expect(sessionFixture.session.connect).not.toHaveBeenCalled();
    await expectAsync(solaceMessageClient.session).toBePending();

    // Provide config.
    config$.next({url: 'url', vpnName: 'vpn'});
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expect connected to the broker.
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
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

  it('should buffer interaction until connected to the broker', async () => {
    const config$ = new Subject<SolaceMessageClientConfig>();
    const sessionFixture = new SessionFixture();
    const sessionSubscribeCaptor = sessionFixture.installSessionSubscribeCaptor();

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => config$),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);

    // Publish a message before connected to the broker.
    const whenPublished = solaceMessageClient.publish('topic', 'data');

    // Subscribe for messages before connected to the broker.
    const observeCaptor = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.observe$('topic').subscribe(observeCaptor);

    // Wait some time.
    await firstValueFrom(timer(500));

    // Expect not published the message yet.
    await expectAsync(whenPublished).toBePending();

    // Simulate connected and subscribed.
    config$.next({url: 'url', vpnName: 'vpn'});
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await sessionFixture.simulateEvent(SessionEventCode.SUBSCRIPTION_OK, sessionSubscribeCaptor.correlationKey);

    // Expect the message to be published.
    await expectAsync(whenPublished).toBeResolved();

    // Simulate receiving a message from the broker.
    const message = createTopicMessage('topic');
    message.setBinaryAttachment('message');
    await sessionFixture.simulateMessage(message);

    // Expect the message to be received.
    const binaryMessage = observeCaptor.getLastValue()!.message.getBinaryAttachment() as Uint8Array;
    expect(new TextDecoder().decode(binaryMessage)).toEqual('message');
  });

  it('should error if interacting with disposed message client', async () => {
    const sessionFixture = new SessionFixture();

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(ɵSolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expect session.
    await expectAsync(solaceMessageClient.session).toBeResolved();

    // Dispose message client.
    await solaceMessageClient.dispose();

    // Expect session to be rejected.
    await expectAsync(solaceMessageClient.session).toBeRejected();

    // Expect sending message to be rejected.
    await expectAsync(solaceMessageClient.publish('topic')).toBeRejected();

    // Expect subscribing for messages to error.
    const captor = new ObserveCaptor<MessageEnvelope>();
    solaceMessageClient.observe$('topic').subscribe(captor);
    await captor.waitUntilCompletedOrErrored();
    expect(captor.hasErrored()).toBeTrue();
  });
});
