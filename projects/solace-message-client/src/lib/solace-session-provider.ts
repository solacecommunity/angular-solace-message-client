import {Injectable} from '@angular/core';
import {Session, SessionProperties, SolclientFactory} from 'solclientjs';

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
  public provide(sessionProperties: SessionProperties): Session {
    return SolclientFactory.createSession(sessionProperties);
  }
}
