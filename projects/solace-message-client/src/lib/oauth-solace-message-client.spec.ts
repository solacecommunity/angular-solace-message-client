import {SolaceMessageClient} from './solace-message-client';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {AuthenticationScheme, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {TestBed} from '@angular/core/testing';
import {Observable} from 'rxjs';
import {inject, Injectable, InjectionToken, NgZone} from '@angular/core';
import {OAuthAccessTokenProvider} from './oauth-access-token-provider';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';

describe('OAuth 2.0', () => {

  beforeEach(() => initSolclientFactory());

  beforeEach(() => {
    spyOn(console, 'warn');
    spyOn(console, 'error');
  });

  it('should invoke `OAuthAccessTokenProvider$provide$` in Angular zone', async () => {
    const sessionFixture = new SessionFixture();

    @Injectable({providedIn: 'root'})
    class TestAccessTokenProvider implements OAuthAccessTokenProvider {

      public constructedInAngularZone: boolean | undefined;
      public invokedInAngularZone: boolean | undefined;
      public subscribedInAngularZone: boolean | undefined;

      constructor() {
        this.constructedInAngularZone = NgZone.isInAngularZone();
      }

      public provide$(): Observable<string> {
        this.invokedInAngularZone = NgZone.isInAngularZone();
        return new Observable(observer => {
          this.subscribedInAngularZone = NgZone.isInAngularZone();
          observer.next('access-token');
        });
      }
    }

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: TestAccessTokenProvider,
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(TestBed.inject(TestAccessTokenProvider).constructedInAngularZone).toBeTrue();
    expect(TestBed.inject(TestAccessTokenProvider).invokedInAngularZone).toBeTrue();
    expect(TestBed.inject(TestAccessTokenProvider).subscribedInAngularZone).toBeTrue();
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

  it('should invoke access token function in injection context', async () => {
    const sessionFixture = new SessionFixture();
    const ACCESS_TOKEN = new InjectionToken<string>('ACCESS_TOKEN');

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => inject(ACCESS_TOKEN),
        }),
        provideSession(sessionFixture),
        {provide: ACCESS_TOKEN, useValue: 'access-token'},
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({
      authenticationScheme: AuthenticationScheme.OAUTH2,
      accessToken: 'access-token',
    }));
  });

  it('should subscribe to access token once', async () => {
    const sessionFixture = new SessionFixture();
    let subscriptionCount = 0;

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => new Observable(observer => {
            subscriptionCount++;
            observer.next('access-token');
          }),
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(subscriptionCount).toBe(1);
  });

  it('should support configuring a "one-time" access token (function)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => 'one-time-access-token',
        }),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await expectAsync(solaceMessageClient.session).toBeResolved();

    // expect "solclientjs" to be initialized with the "one-time" access time
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({
      authenticationScheme: AuthenticationScheme.OAUTH2,
      accessToken: 'one-time-access-token',
    }));
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledWith(jasmine.stringMatching(/\[AccessTokenProviderCompletedWarning]/));
  });

  it('should support configuring a "one-time" access token (static)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: 'one-time-access-token',
        }),
        provideSession(sessionFixture),
      ],
    });

    const solaceMessageClient = TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);
    await expectAsync(solaceMessageClient.session).toBeResolved();

    // expect "solclientjs" to be initialized with the "one-time" access time
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({
      authenticationScheme: AuthenticationScheme.OAUTH2,
      accessToken: 'one-time-access-token',
    }));
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
    expect(console.warn).toHaveBeenCalledWith(jasmine.stringMatching(/\[AccessTokenProviderCompletedWarning]/));
  });
});
