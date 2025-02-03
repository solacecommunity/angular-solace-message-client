import {Component, inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
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

  private readonly _snackBar = inject(MatSnackBar);
  private readonly _locationService = inject(LocationService);
  private readonly _matDialog = inject(MatDialog);

  protected readonly solaceMessageClient = inject(SolaceMessageClient);
  protected readonly sessionConfig = SessionConfigStore.load()!;
  protected readonly AuthenticationScheme = AuthenticationScheme;

  protected onLoginPage(): void {
    this._locationService.navigateToAppRoot({clearConnectProperties: true});
  }

  public onDisconnect(): void {
    void this.solaceMessageClient.disconnect();
  }

  public onConnect(): void {
    this.solaceMessageClient.connect(this.sessionConfig).then(
      () => console.log('Connected to Solace message broker'),
      (error: unknown) => console.error('Failed to connect to Solace message broker', error),
    );
  }

  protected onSessionPropertiesOpen(): void {
    this._snackBar.openFromComponent(SessionPropertiesComponent, {
      data: this.sessionConfig,
      verticalPosition: 'top',
      panelClass: 'session-properties',
    });
  }

  protected onUpdateAccessToken(): void {
    this._matDialog.open(EnterAccessTokenComponent);
  }
}
