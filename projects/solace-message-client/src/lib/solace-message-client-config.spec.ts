import {SolaceMessageClient} from './solace-message-client';
import {TestBed} from '@angular/core/testing';
import {DestinationType, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {inject, InjectionToken, NgZone} from '@angular/core';
import {of, Subject} from 'rxjs';
import {initSolclientFactory} from './testing/testing.utils';
import {SolaceMessageClientConfig} from './solace-message-client.config';

describe('SolaceMessageClient Configuration', () => {

  beforeEach(() => initSolclientFactory());

  it('should create Session Promise in constructor to enable interaction before loaded the config', async () => {
    const asyncConfig$ = new Subject<SolaceMessageClientConfig>();
    const sessionFixture = new SessionFixture();
    const sessionSendCaptor = sessionFixture.installSessionSendCaptor();

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => asyncConfig$),
        provideSession(sessionFixture),
      ],
    });

    // Inject SolaceMessageClient.
    const solaceMessageClient = TestBed.inject(SolaceMessageClient);

    // Publish message before session has been created.
    const published = solaceMessageClient.publish('topic');

    // Get reference to session before it has been created.
    const session = solaceMessageClient.session;

    // Simulate loaded config.
    asyncConfig$.next({url: 'url', vpnName: 'vpn'});

    // Simulate message client to be connected to the broker.
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));

    // Expect session to be resolved.
    await expectAsync(session).toBeResolved();

    // Expect message to be published.
    await expectAsync(published).toBeResolved();
    expect((await session).send).toHaveBeenCalledTimes(1);
    expect(sessionSendCaptor.destination!.getName()).toEqual('topic');
    expect(sessionSendCaptor.destination!.getType()).toEqual(DestinationType.TOPIC);
  });

  it('should use config object', async () => {
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
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should load config synchronously (SolaceMessageClientConfig)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => ({url: 'url', vpnName: 'vpn'})),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should load config asynchronously (Promise)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => Promise.resolve({url: 'url', vpnName: 'vpn'})),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should load config asynchronously (Observable)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => of({url: 'url', vpnName: 'vpn'})),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should invoke config function in injection context', async () => {
    const DI_TOKEN = new InjectionToken<string>('DI_TOKEN');

    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => inject(DI_TOKEN)),
        provideSession(sessionFixture),
        {provide: DI_TOKEN, useValue: {url: 'url', vpnName: 'vpn'}},
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    await expectAsync(solaceMessageClient.session).toBeResolved();
  });

  it('should invoke config function in Angular zone', async () => {
    const sessionFixture = new SessionFixture();
    let invokedInAngularZone: boolean | undefined;
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient(() => {
          invokedInAngularZone = NgZone.isInAngularZone();
          return {url: 'url', vpnName: 'vpn'};
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(NgZone).run(() => TestBed.inject(SolaceMessageClient));
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    expect(invokedInAngularZone).toBeTrue();
  });
});
