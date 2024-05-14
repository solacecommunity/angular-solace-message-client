import {SolaceMessageClient} from './solace-message-client';
import {TestBed} from '@angular/core/testing';
import {SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';

describe('SolaceMessageClient Connect', () => {

  beforeEach(() => initSolclientFactory());

  describe('Auto Connect', () => {
    it('should connect to the Solace message broker when injecting `SolaceMessageClient`', async () => {
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

    it('should connect with the config as provided to \'provideSolaceMessageClient({...})\'', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient({url: 'url', vpnName: 'vpn'}),
          provideSession(sessionFixture),
        ],
      });

      TestBed.inject(SolaceMessageClient);
      await drainMicrotaskQueue();
      expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledOnceWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
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
  });

  describe('Manual Connect', () => {
    it('should not connect to the Solace message broker when injecting `SolaceMessageClient`', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient(),
          provideSession(sessionFixture),
        ],
      });

      const solaceMessageClient = TestBed.inject(SolaceMessageClient);
      await expectAsync(solaceMessageClient.session).toBeRejected();
      expect(sessionFixture.session.connect).toHaveBeenCalledTimes(0);
      expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    });

    it('should reject the Session Promise when the connect attempt fails', async () => {
      const sessionFixture = new SessionFixture();
      TestBed.configureTestingModule({
        providers: [
          provideSolaceMessageClient(),
          provideSession(sessionFixture),
        ],
      });

      const solaceMessageClient = TestBed.inject(SolaceMessageClient);

      const connected = solaceMessageClient.connect({url: 'url', vpnName: 'vpn'});
      await sessionFixture.simulateEvent(SessionEventCode.CONNECT_FAILED_ERROR);

      await expectAsync(connected).toBeRejected();
      expect(sessionFixture.session.connect).toHaveBeenCalledTimes(1);
      expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({url: 'url', vpnName: 'vpn'}));
    });
  });
});
