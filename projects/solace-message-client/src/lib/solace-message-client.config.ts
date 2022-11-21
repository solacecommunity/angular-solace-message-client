import {MessagePublisherProperties, SessionProperties} from 'solclientjs';
import {Type} from '@angular/core';
import {OAuthAccessTokenProvider} from './oauth-access-token-provider';

// Merge class and interface declarations so that it can be used as DI token as well as object literal to configure the library.
// See https://www.typescriptlang.org/docs/handbook/declaration-merging.html for more information.

/**
 * Configures the {@link SolaceMessageClient} to connect to the Solace message broker.
 */
export abstract class SolaceMessageClientConfig implements Omit<SessionProperties, 'publisherProperties' | 'accessToken'> {
  // FIXME typedef(solclientjs): remove 'publisherProperties' and 'Omit' when changed 'publisherProperties' to optional
  public publisherProperties?: MessagePublisherProperties;
  /**
   * Specifies the access token required for OAUTH2 authentication.
   * This is only relevant if the {@link AuthenticationScheme#OAUTH2} authentication scheme is being used.
   *
   * We recommend specifying a {@link OAuthAccessTokenProvider} to continuously provide a valid access token.
   *
   * See {@link OAuthAccessTokenProvider} for detailed instructions how to create and register an access provider.
   */
  public accessToken?: string | Type<OAuthAccessTokenProvider>;
}

/**
 * Configures the {@link SolaceMessageClient} to connect to the Solace message broker.
 */
export interface SolaceMessageClientConfig extends Omit<SessionProperties, 'publisherProperties' | 'accessToken'> {
  // FIXME typedef(solclientjs): remove 'publisherProperties' and 'Omit' when changed 'publisherProperties' to optional
  publisherProperties?: MessagePublisherProperties;
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
