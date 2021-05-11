import { Component } from '@angular/core';
import { SessionProperties, SolaceMessageClient } from 'solace-message-client';
import { SOLACE_CONNECT_PROPERTIES_SESSION_KEY } from '../constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionPropertiesComponent } from '../session-properties/session-properties.component';
import { LocationService } from '../location.service';

@Component({
  selector: 'app-try-me',
  templateUrl: './try-me.component.html',
  styleUrls: ['./try-me.component.scss'],
})
export class TryMeComponent {

  private _sessionProperties: SessionProperties;

  constructor(public solaceMessageClient: SolaceMessageClient,
              private _snackBar: MatSnackBar,
              private _locationService: LocationService) {
    this._sessionProperties = JSON.parse(sessionStorage.getItem(SOLACE_CONNECT_PROPERTIES_SESSION_KEY));
  }

  public onLogout(): void {
    this._locationService.navigateToAppRoot({clearSessionStorage: true});
  }

  public onDisconnect(): void {
    this.solaceMessageClient.disconnect().then();
  }

  public onConnect(): void {
    this.solaceMessageClient.connect(this._sessionProperties).then(
      () => console.log('Connected'),
      err => console.error('Connection failed', err)
    );
  }

  public onSessionPropertiesOpen(): void {
    this._snackBar.openFromComponent(SessionPropertiesComponent, {
      data: this._sessionProperties,
      verticalPosition: 'top',
    });
  }
}
