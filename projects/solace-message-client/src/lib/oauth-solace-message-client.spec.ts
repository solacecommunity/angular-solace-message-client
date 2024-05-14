import {SolaceMessageClient} from './solace-message-client';
import {provideSolaceMessageClient} from './solace-message-client.provider';
import {AuthenticationScheme, SessionEventCode} from 'solclientjs';
import {SessionFixture} from './testing/session.fixture';
import {provideSession} from './testing/session-provider';
import {TestBed} from '@angular/core/testing';
import {BehaviorSubject, EMPTY, NEVER, Observable, of, Subject} from 'rxjs';
import {inject, Injectable, InjectionToken, NgZone} from '@angular/core';
import {OAuthAccessTokenProvider} from './oauth-access-token-provider';
import {drainMicrotaskQueue, initSolclientFactory} from './testing/testing.utils';
import {SolaceSessionProvider} from './solace-session-provider';

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

  it('should inject the access token into the Solace session', async () => {
    const sessionFixture = new SessionFixture();
    const accessToken$ = new Subject<string>();

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => accessToken$,
        }),
        provideSession(sessionFixture),
      ],
    });

    // WHEN injected the message client
    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    // THEN expect "solclientjs" not to be initialized yet, but only after having emitted the access token
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);

    // WHEN emitted the initial access token
    accessToken$.next('access-token-1');
    await drainMicrotaskQueue();
    // THEN
    // expect "solclientjs" to be initialized with the "one-time" access time
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledWith(jasmine.objectContaining({
      authenticationScheme: AuthenticationScheme.OAUTH2,
      accessToken: 'access-token-1',
    }));
    // expect the access token not to be updated
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);

    sessionFixture.sessionProvider.provide.calls.reset();
    sessionFixture.session.updateAuthenticationOnReconnect.calls.reset();

    // WHEN emitted a renewed access token
    accessToken$.next('access-token-2');
    // THEN
    // expect "solclientjs" not to be initialized anew
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    // expect the access token to be updated
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledWith(jasmine.objectContaining({accessToken: 'access-token-2'}));

    sessionFixture.sessionProvider.provide.calls.reset();
    sessionFixture.session.updateAuthenticationOnReconnect.calls.reset();

    // WHEN emitted a renewed access token
    accessToken$.next('access-token-3');
    // THEN
    // expect "solclientjs" not to be initialized anew
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    // expect the access token to be updated
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledWith(jasmine.objectContaining({accessToken: 'access-token-3'}));
  });

  it('should error if not configured an access token or an `OAuthAccessTokenProvider` [NullAccessTokenConfigError]', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[SolaceMessageClient]/), jasmine.stringMatching(/\[NullAccessTokenConfigError]/));
    expect(TestBed.inject(SolaceSessionProvider).provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
  });

  it('should error if forgotten to register `OAuthAccessTokenProvider` as Angular provider [NullAccessTokenProviderError]', async () => {
    // Create a provider, but forget to register it as Angular provider
    @Injectable()
    class TestAccessTokenProvider implements OAuthAccessTokenProvider {
      public provide$(): Observable<string> {
        return NEVER;
      }
    }

    const sessionFixture = new SessionFixture();
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

    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[SolaceMessageClient]/), jasmine.stringMatching(/\[NullAccessTokenProviderError]/));
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
  });

  it('should error when emitting `null` as the initial access token [NullAccessTokenError]', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => of(null! as string),
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[SolaceMessageClient]/), jasmine.stringMatching(/\[NullAccessTokenError]/));
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
  });

  it('should error when emitting `undefined` as the initial access token [NullAccessTokenError]', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => of(undefined! as string),
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[SolaceMessageClient]/), jasmine.stringMatching(/\[NullAccessTokenError]/));
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
  });

  it('should error when the access token Observable completes without having having emitted an access token [EmptyAccessTokenError]', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => EMPTY,
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await drainMicrotaskQueue();

    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[SolaceMessageClient]/), jasmine.stringMatching(/\[EmptyAccessTokenError]/));
    expect(sessionFixture.sessionProvider.provide).toHaveBeenCalledTimes(0);
    expect(sessionFixture.session.updateAuthenticationOnReconnect).toHaveBeenCalledTimes(0);
  });

  it('should warn when the access token Observable completes [AccessTokenProviderCompletedWarning] (1/2)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => of('access token'), // completes after emitted the initial access token,
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(console.warn).toHaveBeenCalledWith(jasmine.stringMatching(/\[AccessTokenProviderCompletedWarning]/));
  });

  it('should warn when the access token Observable completes [AccessTokenProviderCompletedWarning] (2/2)', async () => {
    const sessionFixture = new SessionFixture();
    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => of('access token 1', 'access token 2', 'access token 3'), // completes after 3 emissions
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    expect(console.warn).toHaveBeenCalledWith(jasmine.stringMatching(/\[AccessTokenProviderCompletedWarning]/));
  });

  it('should error when emitting `null` as access token [NullAccessTokenError]', async () => {
    const sessionFixture = new SessionFixture();
    const accessToken$ = new BehaviorSubject<string>('access-token-1');

    TestBed.configureTestingModule({
      providers: [
        provideSolaceMessageClient({
          url: 'url',
          vpnName: 'vpn',
          authenticationScheme: AuthenticationScheme.OAUTH2,
          accessToken: () => accessToken$,
        }),
        provideSession(sessionFixture),
      ],
    });

    TestBed.inject(SolaceMessageClient);
    await sessionFixture.simulateEvent(SessionEventCode.UP_NOTICE);

    accessToken$.next('access-token-2');
    accessToken$.next('access-token-3');
    expect(console.error).not.toHaveBeenCalledWith(jasmine.stringMatching(/\[NullAccessTokenError]/));

    accessToken$.next(null!);
    expect(console.error).toHaveBeenCalledWith(jasmine.stringMatching(/\[NullAccessTokenError]/));
  });
});
