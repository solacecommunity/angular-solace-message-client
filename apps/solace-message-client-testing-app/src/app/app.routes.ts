import {Router, Routes, UrlTree} from '@angular/router';
import {LoginComponent} from './login/login.component';
import {TryMeComponent} from './try-me/try-me.component';
import {SessionConfigStore} from './session-config-store';
import {inject} from '@angular/core';
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';

export const routes: Routes = [
  {
    path: '',
    canActivate: [requireLogin],
    component: TryMeComponent,
    providers: [provideSolaceMessageClient(SessionConfigStore.load())],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
];

function requireLogin(): boolean | UrlTree {
  if (SessionConfigStore.empty()) {
    return inject(Router).createUrlTree(['/login']);
  }
  return true;
}
