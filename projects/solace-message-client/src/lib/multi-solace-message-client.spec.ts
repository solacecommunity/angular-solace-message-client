import {SolaceMessageClient} from './solace-message-client';
import {createEnvironmentInjector, EnvironmentInjector, inject, runInInjectionContext, Type} from '@angular/core';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {LogLevel, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {TestBed} from '@angular/core/testing';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {SolaceSessionProvider, ɵSolaceSessionProvider} from './solace-session-provider';

describe('Multi Environment Configuration', () => {

  beforeEach(() => initSolclientFactory());

  it('should provide separate `SolaceMessageClient` per environment', async () => {
    // Create environment 1.
    const sessionFixture1 = new SessionFixture();
    const environment1 = createEnvironmentInjector(
      [
        provideSolaceMessageClient({url: 'url1', vpnName: 'vpn1'}),
        provideSession(sessionFixture1),
      ],
      TestBed.inject(EnvironmentInjector),
    );

    // Create environment 2.
    const sessionFixture2 = new SessionFixture();
    const environment2 = createEnvironmentInjector(
      [
        provideSolaceMessageClient({url: 'url2', vpnName: 'vpn2'}),
        provideSession(sessionFixture2),
      ],
      TestBed.inject(EnvironmentInjector),
    );

    // Inject SolaceMessageClient 1.
    const solaceMessageClient1 = environment1.get(SolaceMessageClient);
    await sessionFixture1.simulateEvent(SessionEventCode.UP_NOTICE);

    // Inject SolaceMessageClient 2.
    const solaceMessageClient2 = environment2.get(SolaceMessageClient);
    await sessionFixture2.simulateEvent(SessionEventCode.UP_NOTICE);

    // Expect config passed to SolaceSessionProvider.
    expect(sessionFixture1.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url1', vpnName: 'vpn1'}));
    expect(sessionFixture2.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url2', vpnName: 'vpn2'}));

    // Expect different clients and sessions.
    expect(solaceMessageClient1).not.toBe(solaceMessageClient2);
    expect(await solaceMessageClient1.session).toBe(sessionFixture1.session);
    expect(await solaceMessageClient2.session).toBe(sessionFixture2.session);
    expect(sessionFixture1.session).not.toBe(sessionFixture2.session);

    // Destroy environment 1.
    environment1.destroy();
    await drainMicrotaskQueue();

    // Expect session 1 to be destroyed.
    expect(sessionFixture1.session.dispose).toHaveBeenCalled();
    expect(sessionFixture2.session.dispose).not.toHaveBeenCalled();
    sessionFixture1.session.dispose.calls.reset();

    // Destroy environment 2.
    environment2.destroy();
    await drainMicrotaskQueue();

    // Expect session 2 to be destroyed.
    expect(sessionFixture1.session.dispose).not.toHaveBeenCalled();
    expect(sessionFixture2.session.dispose).toHaveBeenCalled();
  });

  it('should provide default `SolaceSessionProvider`', async () => {
    const environment = createEnvironmentInjector(
      [provideSolaceMessageClient()],
      TestBed.inject(EnvironmentInjector),
    );

    expect(environment.get(SolaceSessionProvider)).toBeInstanceOf(ɵSolaceSessionProvider);
  });

  it('should inherit `SolaceSessionProvider` from parent environment', async () => {
    const sessionFixture = new SessionFixture();

    // Configure root environment.
    TestBed.configureTestingModule({
      providers: [
        provideSession(sessionFixture),
      ],
    });

    // Configure child environment.
    const childEnvironment = createEnvironmentInjector(
      [provideSolaceMessageClient({url: 'url', vpnName: 'vpn'})],
      TestBed.inject(EnvironmentInjector),
    );

    // Expect SolaceSessionProvider to be inherited.
    expect(childEnvironment.get(SolaceSessionProvider)).toBe(TestBed.inject(SolaceSessionProvider));

    // Connect to the broker.
    runInInjectionContext(childEnvironment, () => inject(SolaceMessageClient));
    await drainMicrotaskQueue();
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
  });

  it('should provide default `LogLevel`', async () => {
    const environment = createEnvironmentInjector(
      [provideSolaceMessageClient()],
      TestBed.inject(EnvironmentInjector),
    );

    expect(environment.get(LogLevel as unknown as Type<LogLevel>)).toBe(LogLevel.WARN);
  });

  it('should inherit `LogLevel` from parent environment', async () => {
    // Configure root environment.
    TestBed.configureTestingModule({
      providers: [
        {provide: LogLevel, useValue: LogLevel.TRACE},
      ],
    });

    // Configure child environment.
    const childEnvironment = createEnvironmentInjector(
      [provideSolaceMessageClient()],
      TestBed.inject(EnvironmentInjector),
    );

    // Expect LogLevel to be inherited.
    expect(childEnvironment.get(LogLevel as unknown as Type<LogLevel>)).toBe(LogLevel.TRACE);
  });

  it('should provide LogLevel per environment', async () => {
    // Configure root environment with TRACE log level.
    TestBed.configureTestingModule({
      providers: [
        {provide: LogLevel, useValue: LogLevel.TRACE},
      ],
    });

    // Configure child environment with INFO log level.
    const childEnvironment = createEnvironmentInjector(
      [
        provideSolaceMessageClient(),
        {provide: LogLevel, useValue: LogLevel.INFO},
      ],
      TestBed.inject(EnvironmentInjector),
    );

    // Expect LogLevel to be overwritten.
    expect(childEnvironment.get(LogLevel as unknown as Type<LogLevel>)).toBe(LogLevel.INFO);
  });
});
