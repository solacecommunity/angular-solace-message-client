import {SolaceMessageClient} from './solace-message-client';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {AuthenticationScheme} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {TestBed} from '@angular/core/testing';
import {Observable} from 'rxjs';
import {NgZone} from '@angular/core';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';

describe('OAuth 2.0 (zone)', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn').and.callThrough();
    spyOn(console, 'error').and.callThrough();
  });

  it('should invoke access token function in Angular zone', async () => {
    const sessionFixture = new SessionFixture();

    let invokedInAngularZone: boolean | undefined;
    let subscribedInAngularZone: boolean | undefined;

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => {
            invokedInAngularZone = NgZone.isInAngularZone();
            return new Observable(observer => {
              subscribedInAngularZone = NgZone.isInAngularZone();
              observer.next('access-token');
            });
          },
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(invokedInAngularZone).toBeTrue();
    expect(subscribedInAngularZone).toBeTrue();
  });
});
