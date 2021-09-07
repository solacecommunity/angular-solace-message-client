import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {SOLACE_CONNECT_PROPERTIES_SESSION_KEY} from '../constants';

@Injectable({providedIn: 'root'})
export class TryMeActivateGuard implements CanActivate {

  constructor(private _router: Router) {
  }

  public canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (localStorage.getItem(SOLACE_CONNECT_PROPERTIES_SESSION_KEY)) {
      return true;
    }
    return this._router.createUrlTree(['/connect']);
  }
}
