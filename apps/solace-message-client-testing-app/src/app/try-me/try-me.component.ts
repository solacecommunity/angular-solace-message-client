import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {MatSnackBar} from '@angular/material/snack-bar';
import {SessionPropertiesComponent} from '../session-properties/session-properties.component';
import {LocationService} from '../location.service';
import {SessionConfigStore} from '../session-config-store';
import {EnterAccessTokenComponent} from '../enter-access-token/enter-access-token.component';
import {MatDialog} from '@angular/material/dialog';
import {AuthenticationScheme} from 'solclientjs';
import {AsyncPipe} from '@angular/common';
import {SciSashboxComponent, SciSashDirective} from '@scion/components/sashbox';
import {PublisherComponent} from '../publisher/publisher.component';
import {SubscribersComponent} from '../subscribers/subscribers.component';
import {MatButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-try-me',
  templateUrl: './try-me.component.html',
  styleUrls: ['./try-me.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    SciSashboxComponent,
    SciSashDirective,
    PublisherComponent,
    SubscribersComponent,
    MatButton,
    MatTooltip,
    MatIcon,
  ],
})
export class TryMeComponent {

  private readonly _snackBar = inject(MatSnackBar);
  private readonly _locationService = inject(LocationService);
  private readonly _matDialog = inject(MatDialog);

  protected readonly solaceMessageClient = inject(SolaceMessageClient);
  protected readonly sessionConfig = SessionConfigStore.load();
  protected readonly AuthenticationScheme = AuthenticationScheme;

  protected onLoginPage(): void {
    this._locationService.navigateToAppRoot({clearConnectProperties: true});
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
