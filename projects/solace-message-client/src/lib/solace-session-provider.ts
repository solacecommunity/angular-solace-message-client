import {inject, Injectable} from '@angular/core';
import {Session, SessionProperties, SolclientFactory, SolclientFactoryProfiles, SolclientFactoryProperties} from 'solclientjs';
import {Logger} from './logger';

/**
 * Creates a {@link Session} from a given config to connect to the Solace message broker.
 *
 * You may override the default session provider in order to customize session construction, e.g., in tests, as following:
 * `{provide: SolaceSessionProvider, useClass: YourSessionProvider}`
 *
 * The default provider does the following: `solace.SolclientFactory.createSession(sessionProperties)`.
 */
@Injectable()
export abstract class SolaceSessionProvider {

  /**
   * Method invoked to create a {@link Session} from given properties.
   */
  public abstract provide(sessionProperties: SessionProperties): Session;
}

/**
 * @docs-private
 */
@Injectable()
export class ɵSolaceSessionProvider implements SolaceSessionProvider {

  constructor() {
    const factoryProperties = new SolclientFactoryProperties();
    factoryProperties.profile = SolclientFactoryProfiles.version10_5;
    factoryProperties.logLevel = inject(Logger).logLevel;
    SolclientFactory.init(factoryProperties);
  }

  public provide(sessionProperties: SessionProperties): Session {
    return SolclientFactory.createSession(sessionProperties);
  }
}
