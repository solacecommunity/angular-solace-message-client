import {Observable} from 'rxjs';

/**
 * Provides "solclientjs" continuously with a valid "OAuth 2.0 Access Token".
 *
 * OAuth 2.0 enables secure login to the broker while protecting user credentials.
 *
 * This class provides an Observable that emits the user's access token upon subscription, and then continuously emits it when the token is renewed.
 * The Observable should never complete, enabling the connection to the broker to be re-established in the event of a network interruption.
 *
 * Register this class in {@link SolaceMessageClientConfig#accessToken} and enable OAuth 2.0 authentication scheme in {@link SolaceMessageClientConfig#authenticationScheme}.
 *
 * **Example of an `OAuthAccessTokenProvider`**
 *
 * ```ts
 * @Injectable({providedIn: 'root'})
 * export class YourAccessTokenProvider implements OAuthAccessTokenProvider {
 *
 *   constructor(private authService: YourAuthService) {
 *   }
 *
 *   public provide$(): Observable<string> {
 *     return this.authService.accessToken$;
 *   }
 * }
 * ```
 *
 * **Example for configuring Solace Message Client**
 *
 * ```ts
 * import {bootstrapApplication} from '@angular/platform-browser';
 * import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
 * import {AuthenticationScheme} from 'solclientjs';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSolaceMessageClient({
 *       url: 'wss://YOUR-SOLACE-BROKER-URL:443',
 *       vpnName: 'YOUR VPN',
 *       authenticationScheme: AuthenticationScheme.OAUTH2, // enables OAUTH
 *       accessToken: YourAccessTokenProvider, sets your access token provider
 *     }),
 *   ],
 * });
 * ```
 * @deprecated since version 17.1.0; Use `OAuthAccessTokenFn` instead; API will be removed in a future release.
 * @see {@link OAuthAccessTokenFn}
 */
export interface OAuthAccessTokenProvider {

  /**
   * Provides an Observable that emits the user's access token upon subscription, and then continuously emits it when the token is renewed. It never completes.
   */
  provide$(): Observable<string>;
}

/**
 * Signature of a function to provide "solclientjs" continuously with a valid "OAuth 2.0 Access Token".
 *
 * OAuth 2.0 enables secure login to the broker while protecting user credentials.
 *
 * Returns an Observable that emits the user's access token upon subscription, and then continuously emits it when the token is renewed.
 * The Observable should never complete, enabling the connection to the broker to be re-established in the event of a network interruption.
 *
 * Register this function in {@link SolaceMessageClientConfig#accessToken} and enable OAuth 2.0 authentication scheme in {@link SolaceMessageClientConfig#authenticationScheme}.
 *
 * **Example:**
 *
 * ```ts
 * import {bootstrapApplication} from '@angular/platform-browser';
 * import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
 * import {AuthenticationScheme} from 'solclientjs';
 * import {inject} from '@angular/core';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSolaceMessageClient({
 *       url: 'wss://YOUR-SOLACE-BROKER-URL:443',
 *       vpnName: 'YOUR VPN',
 *       authenticationScheme: AuthenticationScheme.OAUTH2, // enable OAuth 2.0
 *       accessToken: () => inject(AuthService).accessToken$, // provide access token
 *     }),
 *   ],
 * });
 * ```
 *
 * The function can call `inject` to get any required dependencies.
 */
export type OAuthAccessTokenFn = () => string | Observable<string>;
