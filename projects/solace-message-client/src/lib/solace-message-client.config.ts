import {SessionProperties} from 'solclientjs';
import {InjectionToken, Type} from '@angular/core';
import {OAuthAccessTokenProvider} from './oauth-access-token-provider';
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
   * Specifies the access token required for OAUTH2 authentication.
   * This is only relevant if the {@link AuthenticationScheme#OAUTH2} authentication scheme is being used.
   *
   * We recommend using a {@link OAuthAccessTokenProvider} to continuously provide a valid access token.
   *
   * See {@link OAuthAccessTokenProvider} for detailed instructions how to create and register an access provider.
   */
  accessToken?: string | Type<OAuthAccessTokenProvider>;
}

/**
 * Signature of a function to load the config of Angular Solace Message Client.
 *
 * The function can call `inject` to get any required dependencies.
 */
export type SolaceMessageClientConfigFn = () => SolaceMessageClientConfig | Promise<SolaceMessageClientConfig> | Observable<SolaceMessageClientConfig>;
