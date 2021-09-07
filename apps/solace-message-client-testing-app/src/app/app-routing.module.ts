import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ConnectComponent} from './connect/connect.component';
import {TryMeComponent} from './try-me/try-me.component';
import {TryMeActivateGuard} from './try-me/try-me-activate.guard';

const routes: Routes = [
  {
    path: 'connect',
    component: ConnectComponent,
  },
  {
    path: '',
    canActivate: [TryMeActivateGuard],
    component: TryMeComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
