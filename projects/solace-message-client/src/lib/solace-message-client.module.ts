import { Inject, Injectable, InjectionToken, ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { NullSolaceMessageClient, SolaceMessageClient } from './solace-message-client';
import { ɵSolaceMessageClient } from './ɵsolace-message-client';
import { TopicMatcher } from './topic-matcher';
import { SolaceSessionProvider, ɵSolaceSessionProvider } from './solace-session-provider';
import { SolaceMessageClientConfig } from './solace-message-client.config';

/**
 * Allows clients to communicate with a Solace messaging broker for sending and receiving messages using the native SMF protocol (Solace Message Format).
 *
 * ---
 * Usage:
 *
 * #### Importing the module in app module:
 *
 * ```
 * @NgModule({
 *   imports: [
 *     ...
 *     SolaceMessageClientModule.forRoot({
 *       url:      'wss://xxx.messaging.solace.cloud:443',
 *       vpnName:  'xxx',
 *       userName: 'xxx',
 *       password: 'xxx',
 *     });
 *   ],
 *   ...
 * })
 * export class AppModule { }
 * ```
 * If providing a config, this module establishes a connection to the Solace message broker when injecting the {@link SolaceMessageClient} for the first time.
 * To be more flexible in providing the config, invoke this method without config. Then, connect to the Solace message broker by invoking
 * {@link SolaceMessageClient.connect} and provide the connection config. Typically, you do this in an app initializer.
 *
 * #### Publishing a message to a topic:
 *
 * ```
 * @Injectable()
 * public class TemperaturePublisher {
 *
 *   constructor(private solaceMessageClient: SolaceMessageClient) {
 *   }
 *
 *   public publish(temperature: number): void {
 *     this.solaceMessageClient.publish('myhome/kitchen/temperature', '20°C');
 *   }
 * }
 * ```
 *
 *
 * #### Receiving messages sent to a topic:
 *
 * ```
 * public class TemperatureReceiver {
 *
 *   constructor(solaceMessageClient: SolaceMessageClient) {
 *     solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(envelope => {
 *        ...
 *     });
 *   }
 * }
 * ```
 */
@NgModule({})
export class SolaceMessageClientModule {

  constructor(@Inject(FORROOT_GUARD) _guard: any, _solaceMessageClient: SolaceMessageClient /** eager construction */) {
  }

  /**
   * Invoke this method to import this module into the root injector, app module. In lazy loaded modules, invoke {@link SolaceMessageClientModule#forChild}
   * instead.
   *
   * Call `forRoot` only in the root application module. Calling it in any other module, particularly in a lazy-loaded module, will throw a runtime error.
   *
   * If providing a config, this module establishes a connection to the Solace message broker when injecting the {@link SolaceMessageClient} for the first time.
   * To be more flexible in providing the config, invoke this method without config. Then, connect to the Solace message broker by invoking
   * {@link SolaceMessageClient.connect} and provide the connection config. Typically, you do this in an app initializer.
   *
   * ```
   * @NgModule({
   *   imports: [
   *     ...
   *     SolaceMessageClientModule.forRoot({
   *       url:      'wss://xxx.messaging.solace.cloud:443',
   *       vpnName:  '...',
   *       userName: '..',
   *       password: '..',
   *     });
   *   ],
   *   ...
   * })
   * export class AppModule { }
   * ```
   *
   * @param config - Specifies the config how to connect to the Solace message broker when injecting the {@link SolaceMessageClient} for the first time.
   *                 If not providing a config, {@link SolaceMessageClient} does not automatically establish a connection. Instead, you need to call
   *                 {@link SolaceMessageClient.connect} yourself and provide the config.
   */
  public static forRoot(config?: SolaceMessageClientConfig): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [
        ForRootGuardService,
        {provide: SolaceMessageClientConfig, useValue: config},
        {provide: SolaceMessageClient, useClass: ɵSolaceMessageClient},
        {provide: SolaceSessionProvider, useClass: ɵSolaceSessionProvider},
        TopicMatcher,
        {
          provide: FORROOT_GUARD,
          useFactory: provideForRootGuard,
          deps: [[ForRootGuardService, new Optional(), new SkipSelf()]],
        },
      ],
    };
  }

  /**
   * Invoke this method to import this module into modules others than app module.
   */
  public static forChild(): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [], // do not register any providers in 'forChild' but in 'forRoot' instead
    };
  }

  /**
   * Invoke this method to import this module in specs, installing a message client that does nothing.
   */
  public static forSpec(): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [
        {
          provide: SolaceMessageClient,
          useClass: NullSolaceMessageClient,
        },
      ],
    };
  }
}

/**
 * DI injection token to ensure `UxProposalFieldModule.forRoot()` is not used in a lazy context.
 *
 * @docs-private
 */
export const FORROOT_GUARD = new InjectionToken<void>('UX_PROPOSAL_FIELD_FORROOT_GUARD');

/**
 * @docs-private
 *
 * @docs-private
 */
export function provideForRootGuard(guard: ForRootGuardService): any {
  if (guard) {
    throw Error('[ModuleForRootError] SolaceMessageClientModule is not supported in a lazy context.');
  }
  return 'guarded';
}

/**
 * @docs-private
 */
@Injectable()
export class ForRootGuardService {
}
