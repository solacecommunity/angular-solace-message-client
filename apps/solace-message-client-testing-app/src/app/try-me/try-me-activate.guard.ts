import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {SessionConfigStore} from '../session-config-store';

@Injectable({providedIn: 'root'})
export class TryMeActivateGuard implements CanActivate {

  constructor(private _router: Router) {
  }

  public canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (SessionConfigStore.empty()) {
      return this._router.createUrlTree(['/login']);
    }
    return true;
  }
}
