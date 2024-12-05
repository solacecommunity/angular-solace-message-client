import {Observable} from 'rxjs';

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
