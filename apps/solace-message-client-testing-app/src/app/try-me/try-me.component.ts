import {Component} from '@angular/core';
import {SolaceMessageClient, SolaceMessageClientConfig} from '@solace-community/angular-solace-message-client';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SessionPropertiesComponent} from '../session-properties/session-properties.component';
import {LocationService} from '../location.service';
import {SessionConfigStore} from '../session-config-store';
import {EnterAccessTokenComponent} from '../enter-access-token/enter-access-token.component';
import {MatDialog} from '@angular/material/dialog';
import {AuthenticationScheme} from 'solclientjs';
import {AsyncPipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {SciSashboxComponent, SciSashDirective} from '@scion/components/sashbox';
import {PublisherComponent} from '../publisher/publisher.component';
import {SubscribersComponent} from '../subscribers/subscribers.component';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-try-me',
  templateUrl: './try-me.component.html',
  styleUrls: ['./try-me.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SciSashboxComponent,
    SciSashDirective,
    PublisherComponent,
    SubscribersComponent,
  ],
})
export class TryMeComponent {

  public sessionConfig: SolaceMessageClientConfig;
  public AuthenticationScheme = AuthenticationScheme;

  constructor(public solaceMessageClient: SolaceMessageClient,
              private _snackBar: MatSnackBar,
              private _locationService: LocationService,
              private _matDialog: MatDialog) {
    this.sessionConfig = SessionConfigStore.load()!;
  }

  public onLoginPage(): void {
    this._locationService.navigateToAppRoot({clearConnectProperties: true});
  }

  public onDisconnect(): void {
    this.solaceMessageClient.disconnect().then();
  }

  public onConnect(): void {
    this.solaceMessageClient.connect(this.sessionConfig).then(
      () => console.log('Connected to Solace message broker'),
      error => console.error('Failed to connect to Solace message broker', error),
    );
  }

  public onSessionPropertiesOpen(): void {
    this._snackBar.openFromComponent(SessionPropertiesComponent, {
      data: this.sessionConfig,
      verticalPosition: 'top',
      panelClass: 'session-properties',
    });
  }

  public onUpdateAccessToken(): void {
    this._matDialog.open(EnterAccessTokenComponent);
  }
}
