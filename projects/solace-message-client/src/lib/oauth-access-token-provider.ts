import {Observable} from 'rxjs';

/**
 * Provides "solclientjs" continuously with a valid "OAuth 2.0 Access Token".
 *
 * OAuth 2.0 enables secure login to the broker while protecting user credentials.
 *
 * Follow these steps to enable OAuth authentication:
 * - Create an access token provider:
 *   - Provide a class that implements {@link OAuthAccessTokenProvider}.
 *   - Implement the {@link OAuthAccessTokenProvider.provide$} method. The method should return an Observable that, when being subscribed, emits the user's access token, and then emits continuously when the token is renewed. It should never complete. Otherwise, the connection to the broker would not be re-established in the event of a network interruption.
 * - Enable OAUTH and configure the access token in the config passed to {@link provideSolaceMessageClient} or {@link SolaceMessageClient#connect}, as follows:
 *   - Set {@link SolaceMessageClientConfig#authenticationScheme} to {@link AuthenticationScheme.OAUTH2}.
 *   - Set {@link SolaceMessageClientConfig#accessToken} to the above provider class.
 *
 * #### Example of an `OAuthAccessTokenProvider`
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
 * #### Example for the configuration of the Solace Message Client
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
 */
export interface OAuthAccessTokenProvider {

  /**
   * Provides the Solace {@link Session} continuously with a valid "OAuth 2.0 Access Token".
   *
   * Returns an Observable that, when being subscribed, emits the user's access token, and then emits continuously when the token is renewed.
   * It should never complete. Otherwise, the connection to the broker would not be re-established in the event of a network interruption.
   */
  provide$(): Observable<string>;
}

