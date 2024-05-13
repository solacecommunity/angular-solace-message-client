import {EnvironmentProviders, inject, InjectionToken, makeEnvironmentProviders} from '@angular/core';
import {SOLACE_MESSAGE_CLIENT_CONFIG, SolaceMessageClientConfig, SolaceMessageClientConfigFn} from './solace-message-client.config';
import {provideLogger} from './logger';
import {ɵSolaceMessageClient} from './ɵsolace-message-client';
import {SolaceSessionProvider, ɵSolaceSessionProvider} from './solace-session-provider';
import {NullSolaceMessageClient, SolaceMessageClient} from './solace-message-client';
import {LogLevel} from 'solclientjs';

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
 * Alternatively, a function can be passed to load the config asynchronously. The function can call `inject` to get any required dependencies.
 *
 * The connection to the broker will be established when `SolaceMessageClient` is injected for the first time.
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
 * ### Connect to Multiple Solace Message Brokers
 *
 * An application is not limited to connecting to a single Solace Message Broker. Different injection environments can be used to connect to different brokers.
 *
 * Angular injection environments form a hierarchy, inheriting providers from parent environments. An environment can register new providers or replace inherited providers.
 * A child environment is created through routing or programmatically using `createEnvironmentInjector`.
 *
 * Example for connecting to two different brokers:
 *
 * ```ts
 * import {createEnvironmentInjector, EnvironmentInjector, inject} from '@angular/core';
 * import {provideSolaceMessageClient, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
 *
 * // Create environment to provide message client for broker 1.
 * const environment1 = createEnvironmentInjector([provideSolaceMessageClient({url: 'broker-1'})], inject(EnvironmentInjector));
 * // Inject message client.
 * const messageClient1 = environment1.get(SolaceMessageClient);
 * // Publish message to broker 1.
 * messageClient1.publish('topic', 'message for broker 1');
 *
 * // Create environment to provide message client for broker 2.
 * const environment2 = createEnvironmentInjector([provideSolaceMessageClient({url: 'broker-2'})], inject(EnvironmentInjector));
 * // Inject message client.
 * const messageClient2 = environment2.get(SolaceMessageClient);
 * // Publish message to broker 2.
 * messageClient2.publish('topic', 'message for broker 2');
 *
 * // Destroy environments to destroy provided `SolaceMessageClient` instances.
 * environment1.destroy();
 * environment2.destroy();
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
 *                 Can be an object or a function to provide the config asynchronously.
 *                 The function can call `inject` to get any required dependencies.
 */
export function provideSolaceMessageClient(config?: SolaceMessageClientConfig | SolaceMessageClientConfigFn): EnvironmentProviders {
  const SOLACE_SESSION_PROVIDER = new InjectionToken<SolaceSessionProvider>('SOLACE_SESSION_PROVIDER');

  return makeEnvironmentProviders([
    {provide: SOLACE_MESSAGE_CLIENT_CONFIG, useValue: config},
    {provide: SolaceMessageClient, useClass: ɵSolaceMessageClient},
    {provide: SOLACE_SESSION_PROVIDER, useClass: ɵSolaceSessionProvider},
    // Provide inherited 'SolaceSessionProvider' or provide new instance otherwise.
    {provide: SolaceSessionProvider, useFactory: () => inject(SolaceSessionProvider, {skipSelf: true, optional: true}) ?? inject(SOLACE_SESSION_PROVIDER)},
    provideLogger(LogLevel.WARN),
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
