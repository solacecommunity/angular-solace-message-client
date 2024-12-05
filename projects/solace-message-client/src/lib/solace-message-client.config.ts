import {SessionProperties} from 'solclientjs';
import {InjectionToken} from '@angular/core';
import {OAuthAccessTokenFn} from './oauth-access-token-provider';
import {Observable} from 'rxjs';

/**
 * DI token to inject the config of Angular Solace Message Client.
 */
export const SOLACE_MESSAGE_CLIENT_CONFIG = new InjectionToken<SolaceMessageClientConfig | SolaceMessageClientConfigFn | undefined>('SOLACE_MESSAGE_CLIENT_CONFIG');

/**
 * Configures the {@link SolaceMessageClient} to connect to the Solace message broker.
 */
export interface SolaceMessageClientConfig extends Omit<SessionProperties, 'accessToken'> {
  /**
   * Specifies the access token for OAuth 2.0 authentication.
   *
   * Property is ignored if not using OAuth 2.0 authentication scheme.
   *
   * @see {@link OAuthAccessTokenFn}
   */
  accessToken?: string | OAuthAccessTokenFn;
}

/**
 * Signature of a function to load the config of Angular Solace Message Client.
 *
 * The function can call `inject` to get any required dependencies.
 */
export type SolaceMessageClientConfigFn = () => SolaceMessageClientConfig | Promise<SolaceMessageClientConfig> | Observable<SolaceMessageClientConfig>;
