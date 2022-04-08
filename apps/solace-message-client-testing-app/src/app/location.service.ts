import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {LocalStorageKeys} from './local-storage-keys';

@Injectable({providedIn: 'root'})
export class LocationService {

  constructor(private _router: Router) {
  }

  public navigateToAppRoot(options: { clearConnectProperties: boolean }): void {
    if (options.clearConnectProperties) {
      localStorage.removeItem(LocalStorageKeys.SOLACE_CONNECT_CONFIG);
    }
    this._router.navigate(['/']).then(() => location.reload());
  }
}
