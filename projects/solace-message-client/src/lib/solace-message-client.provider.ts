import {EnvironmentProviders, makeEnvironmentProviders} from '@angular/core';
import {SOLACE_MESSAGE_CLIENT_CONFIG, SolaceMessageClientConfig} from './solace-message-client.config';
import {provideLogger} from './logger';
import {ɵSolaceMessageClient} from './ɵsolace-message-client';
import {SolaceSessionProvider, ɵSolaceSessionProvider} from './solace-session-provider';
import {NullSolaceMessageClient, SolaceMessageClient} from './solace-message-client';

/**
 * Enables and configures the Angular Solace Message Client, returning a set of dependency-injection providers to be registered in Angular.
 *
 * The Solace Message Client provides API to communicate with a Solace messaging broker for sending and receiving messages using the native SMF protocol (Solace Message Format).
 *
 * ### Setup
 *
 * ```ts
 * import {bootstrapApplication} from '@angular/platform-browser';
 * import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSolaceMessageClient({
 *       url: 'wss://YOUR-SOLACE-BROKER-URL:443',
 *       vpnName: 'YOUR VPN',
 *       userName: 'YOUR USERNAME',
 *       password: 'YOUR PASSWORD',
 *     })
 *   ],
 * });
 * ```
 *
 * If providing a config to {@link provideSolaceMessageClient}, the {@link SolaceMessageClient} will automatically connect to the broker the first time it is injected. Alternatively, for more flexibility in providing the config, do not pass a config and connect manually using {@link SolaceMessageClient.connect}.
 *
 * ### Usage
 *
 * **Publish a message to a topic**
 *
 * ```ts
 * import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
 * import {inject} from '@angular/core';
 *
 * inject(SolaceMessageClient).publish('myhome/kitchen/temperature', '20°C');
 * ```
 *
 * **Receive messages sent to a topic**
 *
 * ```ts
 * import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
 * import {inject} from '@angular/core';
 *
 * inject(SolaceMessageClient).observe$('myhome/livingroom/temperature').subscribe(envelope => {
 *   // ...
 * });
 * ```
 *
 * ### Logging
 *
 * The default log level is set to `WARN` so that only warnings and errors are logged.
 *
 * The default log level can be changed as follows:
 *
 * ```ts
 * import {bootstrapApplication} from '@angular/platform-browser';
 * import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
 * import {LogLevel} from 'solclientjs';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSolaceMessageClient(),
 *     {provide: LogLevel, useValue: LogLevel.INFO}, // Add this line
 *   ],
 * });
 * ```
 *
 * To change the log level at runtime, add the `angular-solace-message-client#loglevel` entry to session storage
 * and reload the application. Supported log levels are: `trace`, `debug`, `info`, `warn`, `error` and `fatal`.
 *
 * Storage Key: `angular-solace-message-client#loglevel`
 * Storage Value: `info`
 *
 * @param config - Configures {@link SolaceMessageClient}.
 *                 If providing a config, the {@link SolaceMessageClient} will automatically connect to the broker the first time it is injected.
 *                 Alternatively, for more flexibility in providing the config, do not pass a config and connect manually using {@link SolaceMessageClient.connect}.
 */
export function provideSolaceMessageClient(config?: SolaceMessageClientConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {provide: SOLACE_MESSAGE_CLIENT_CONFIG, useValue: config},
    {provide: SolaceMessageClient, useClass: ɵSolaceMessageClient},
    {provide: SolaceSessionProvider, useClass: ɵSolaceSessionProvider},
    provideLogger(),
  ]);
}

/**
 * Provides {@link SolaceMessageClient} which does nothing, e.g, useful in tests.
 *
 * ---
 * Usage:
 *
 * ```ts
 * TestBed.configureTestingModule({
 *   providers: [
 *     provideNullSolaceMessageClient(),
 *   ],
 * });
 * ```
 */
export function provideNullSolaceMessageClient(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SolaceMessageClient,
      useClass: NullSolaceMessageClient,
    },
  ]);
}
