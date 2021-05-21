import { Injectable } from '@angular/core';
import { SessionProperties } from './solace.model';
import * as solace from 'solclientjs/lib-browser/solclient-full';

/**
 * Creates a {@link solace.Session} from a given config to connect to the Solace message broker.
 *
 * You may override the default session provider in order to customize session construction, e.g., in tests, as following:
 * `{provide: SolaceSessionProvider, useClass: YourSessionProvider}`
 *
 * The default provider does the following: `solace.SolclientFactory.createSession(sessionProperties)`.
 */
@Injectable()
export abstract class SolaceSessionProvider {

  /**
   * Method invoked to create a {@link solace.Session} from given properties.
   */
  public abstract provide(sessionProperties: SessionProperties): solace.Session;
}

/**
 * @docs-private
 */
@Injectable()
export class eSolaceSessionProvider implements SolaceSessionProvider { // tslint:disable-line:class-name
  public provide(sessionProperties: SessionProperties): solace.Session {
    return solace.SolclientFactory.createSession(sessionProperties);
  }
}
