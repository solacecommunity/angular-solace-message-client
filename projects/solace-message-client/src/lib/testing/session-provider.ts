import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {SolaceSessionProvider} from '../solace-session-provider';
import {SessionFixture} from './session.fixture';
import {SessionProperties} from 'solclientjs';

/**
 * Creates {@link EnvironmentProviders} with a {@link SolaceSessionProvider} that provides the {@link Session} of the passed {@link SessionFixture}.
 */
export function provideSession(sessionFixture: SessionFixture): EnvironmentProviders {
  const sessionProvider = jasmine.createSpyObj<SolaceSessionProvider>('SolaceSessionProvider', ['provide']);
  sessionProvider.provide.and.callFake((properties: SessionProperties) => {
    sessionFixture.sessionProvider.provide(properties);
    return sessionFixture.session;
  });

  return makeEnvironmentProviders([
    {provide: SolaceSessionProvider, useValue: sessionProvider},
  ]);
}
