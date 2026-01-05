import {SolaceMessageClient} from './solace-message-client';
import {createEnvironmentInjector, EnvironmentInjector} from '@angular/core';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {SessionEventCode} from 'solclientjs/lib-browser/solclient-full';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {TestBed} from '@angular/core/testing';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {ɵSolaceMessageClient} from './ɵsolace-message-client';

describe('Solace Message Client Dispose', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn').and.callThrough();
    spyOn(console, 'error').and.callThrough();
  });

  it('should gracefully dispose session when environment is destroyed', async () => {
    const sessionFixture = new SessionFixture();
    const environment = createEnvironmentInjector(
      [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
      TestBed.inject(EnvironmentInjector),
    );
    sessionFixture.disableFiringDownEventOnDisconnect();

    // Inject SolaceMessageClient.
    environment.get(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));

    // Destroy environment.
    environment.destroy();
    await drainMicrotaskQueue(2);

    // Expect session to be disconnected.
    expect(sessionFixture.session.disconnect).toHaveBeenCalled();
    expect(sessionFixture.session.dispose).not.toHaveBeenCalled();

    // Simulate the session to be disconnected
    await sessionFixture.simulateEvent(SessionEventCode.DISCONNECTED);

    // Expect session to be disposed.
    expect(sessionFixture.session.dispose).toHaveBeenCalled();
  });

  it('should allow for graceful session disposal', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });
    sessionFixture.disableFiringDownEventOnDisconnect();

    // Inject SolaceMessageClient.
    const solaceMessageClient = TestBed.inject(ɵSolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));

    // Dispose SolaceMessageClient.
    void solaceMessageClient.dispose();
    await drainMicrotaskQueue(2);

    // Expect session to be disconnected.
    expect(sessionFixture.session.disconnect).toHaveBeenCalled();
    expect(sessionFixture.session.dispose).not.toHaveBeenCalled();

    // Simulate the session to be disconnected
    await sessionFixture.simulateEvent(SessionEventCode.DISCONNECTED);

    // Expect session to be disposed.
    expect(sessionFixture.session.dispose).toHaveBeenCalled();
  });

  it('should allow for non-graceful session disposal (force)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });

    // Inject SolaceMessageClient.
    const solaceMessageClient = TestBed.inject(ɵSolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));

    // Dispose SolaceMessageClient.
    await solaceMessageClient.dispose({force: true});

    // Expect session to be destroyed.
    expect(sessionFixture.session.disconnect).not.toHaveBeenCalled();
    expect(sessionFixture.session.dispose).toHaveBeenCalled();
  });

  it('should dispose session if disconnect fails', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
        provideSession(sessionFixture),
      ],
    });

    // Inject SolaceMessageClient.
    const solaceMessageClient = TestBed.inject(ɵSolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
    expect(sessionFixture.session.getSessionProperties()).toEqual(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));

    // Dispose SolaceMessageClient, simulating disconnect to fail.
    sessionFixture.session.disconnect.and.throwError('Failed to disconnect');
    void solaceMessageClient.dispose();
    await drainMicrotaskQueue(2);

    // Expect session to be disposed.
    expect(sessionFixture.session.disconnect).toHaveBeenCalled();
    expect(sessionFixture.session.dispose).toHaveBeenCalled();

    // Expect a warning to be logged.
    expect(console.warn).toHaveBeenCalledWith(jasmine.stringContaining('Failed to gracefully disconnect from the Solace Message Broker'), jasmine.anything());
  });
});
