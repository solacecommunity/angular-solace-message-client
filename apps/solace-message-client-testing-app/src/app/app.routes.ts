import {Router, Routes, UrlTree} from '@angular/router';
import {LoginComponent} from './login/login.component';
import {TryMeComponent} from './try-me/try-me.component';
import {SessionConfigStore} from './session-config-store';
import {inject} from '@angular/core';

export const routes: Routes = [
  {
    path: '',
    canActivate: [requireLogin],
    component: TryMeComponent,
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
