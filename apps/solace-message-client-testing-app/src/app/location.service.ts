import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SOLACE_CONNECT_PROPERTIES_SESSION_KEY } from './constants';

@Injectable({providedIn: 'root'})
export class LocationService {

  constructor(private _router: Router) {
  }

  public navigateToAppRoot(options: { clearConnectProperties: boolean }): void {
    if (options.clearConnectProperties) {
      localStorage.removeItem(SOLACE_CONNECT_PROPERTIES_SESSION_KEY);
    }
    this._router.navigate(['/']).then(() => location.reload());
  }
}
