import {inject, NgModule} from '@angular/core';
import {Router, RouterModule, Routes, UrlTree} from '@angular/router';
import {LoginComponent} from './login/login.component';
import {TryMeComponent} from './try-me/try-me.component';
import {SessionConfigStore} from './session-config-store';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    canActivate: [autoLoginGuardFn],
    component: TryMeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule],
})
export class AppRoutingModule {
}

function autoLoginGuardFn(): boolean | UrlTree {
  if (SessionConfigStore.empty()) {
    return inject(Router).createUrlTree(['/login']);
  }
  return true;
}
