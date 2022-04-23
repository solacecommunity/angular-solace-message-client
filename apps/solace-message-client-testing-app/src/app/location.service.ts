import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {SessionConfigStore} from './session-config-store';

@Injectable({providedIn: 'root'})
export class LocationService {

  constructor(private _router: Router) {
  }

  public navigateToAppRoot(options: { clearConnectProperties: boolean }): void {
    if (options.clearConnectProperties) {
      SessionConfigStore.clear();
    }
    this._router.navigate(['/']).then(() => location.reload());
  }
}
