import {SolaceMessageClient} from './solace-message-client';
import {TestBed} from '@angular/core/testing';
import {SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {NgZone} from '@angular/core';
import {initSolclientFactory} from './testing/testing.utils';

describe('SolaceMessageClient Configuration (zone)', () => {

  beforeEach(() => initSolclientFactory());

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
