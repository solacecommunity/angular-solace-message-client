import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {LocalStorageKeys} from '../local-storage-keys';

@Injectable({providedIn: 'root'})
export class TryMeActivateGuard implements CanActivate {

  constructor(private _router: Router) {
  }

  public canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (localStorage.getItem(LocalStorageKeys.SOLACE_CONNECT_CONFIG)) {
      return true;
    }
    return this._router.createUrlTree(['/connect']);
  }
}
