import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({providedIn: 'root'})
export class LocationService {

  constructor(private _router: Router) {
  }

  public navigateToAppRoot(options: { clearSessionStorage: boolean }): void {
    if (options.clearSessionStorage) {
      sessionStorage.clear();
    }
    this._router.navigate(['/']).then(() => location.reload());
  }
}
