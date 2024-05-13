import {ApplicationConfig, EnvironmentProviders, importProvidersFrom, makeEnvironmentProviders} from '@angular/core';
import {provideRouter, withHashLocation} from '@angular/router';
import {routes} from './app.routes';
import {SolaceMessageClientModule} from '@solace-community/angular-solace-message-client';
import {SessionConfigStore} from './session-config-store';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {provideAnimations} from '@angular/platform-browser/animations';

/**
 * Central place to configure the Try Me Application.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideAnimations(),
    importProvidersFrom(SolaceMessageClientModule.forRoot(SessionConfigStore.load())),
    provideMaterialDefaults(),
  ],
};

function provideMaterialDefaults(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {floatLabel: 'always', appearance: 'outline'}},
  ]);
}
