import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {SessionConfigStore} from './session-config-store';

@Injectable({providedIn: 'root'})
export class LocationService {

  private readonly _router = inject(Router);

  public navigateToAppRoot(options: {clearConnectProperties: boolean}): void {
    if (options.clearConnectProperties) {
      SessionConfigStore.clear();
    }
    void this._router.navigate(['/']).then(() => location.reload());
  }
}
