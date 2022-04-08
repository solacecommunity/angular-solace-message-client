import {Component} from '@angular/core';
import {SolaceMessageClient, SolaceMessageClientConfig} from '@solace-community/angular-solace-message-client';
import {LocalStorageKeys} from '../local-storage-keys';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SessionPropertiesComponent} from '../session-properties/session-properties.component';
import {LocationService} from '../location.service';

@Component({
  selector: 'app-try-me',
  templateUrl: './try-me.component.html',
  styleUrls: ['./try-me.component.scss'],
})
export class TryMeComponent {

  public connectConfig: SolaceMessageClientConfig;

  constructor(public solaceMessageClient: SolaceMessageClient,
              private _snackBar: MatSnackBar,
              private _locationService: LocationService) {
    this.connectConfig = JSON.parse(localStorage.getItem(LocalStorageKeys.SOLACE_CONNECT_CONFIG)!);
  }

  public onLogout(): void {
    this._locationService.navigateToAppRoot({clearConnectProperties: true});
  }

  public onDisconnect(): void {
    this.solaceMessageClient.disconnect().then();
  }

  public onConnect(): void {
    this.solaceMessageClient.connect(this.connectConfig).then(
      () => console.log('Connected to Solace message broker'),
      error => console.error('Failed to connect to Solace message broker', error),
    );
  }

  public onSessionPropertiesOpen(): void {
    this._snackBar.openFromComponent(SessionPropertiesComponent, {
      data: this.connectConfig,
      verticalPosition: 'top',
    });
  }
}
