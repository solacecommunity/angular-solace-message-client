import {ModuleWithProviders, NgModule} from '@angular/core';
import {SolaceMessageClientConfig} from './solace-message-client.config';
import {provideNullSolaceMessageClient, provideSolaceMessageClient} from './solace-message-client.provider';

/**
 * Enables and configures the Angular Solace Message Client.
 *
 * This class is deprecated and will be removed in a future release. Use {@link provideSolaceMessageClient} instead.
 *
 * @deprecated since version 17.1.0; Register Angular Solace Message Client using `provideSolaceMessageClient` function; API will be removed in a future release.
 */
@NgModule({})
export class SolaceMessageClientModule {

  /**
   * @deprecated since version 17.1.0; Register Angular Solace Message Client using `provideSolaceMessageClient` function; API will be removed in a future release.
   */
  public static forRoot(config?: SolaceMessageClientConfig): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [provideSolaceMessageClient(config)],
    };
  }

  /**
   * @deprecated since version 17.1.0; Register Angular Solace Message Client using `provideSolaceMessageClient` function; API will be removed in a future release.
   */
  public static forChild(): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [], // do not register any providers in 'forChild' but in 'forRoot' instead
    };
  }

  /**
   * @deprecated since version 17.1.0; Register Angular Solace Message Client using `provideNullSolaceMessageClient` function; API will be removed in a future release.
   */
  public static forSpec(): ModuleWithProviders<SolaceMessageClientModule> {
    return {
      ngModule: SolaceMessageClientModule,
      providers: [provideNullSolaceMessageClient()],
    };
  }
}
