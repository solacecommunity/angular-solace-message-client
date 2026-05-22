import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA, MatSnackBar} from '@angular/material/snack-bar';
import {Clipboard} from '@angular/cdk/clipboard';
import {SessionProperties} from 'solclientjs';
import {KeyValuePipe} from '@angular/common';
import {MatButton, MatMiniFabButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-session-properties',
  templateUrl: './session-properties.component.html',
  styleUrls: ['./session-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KeyValuePipe,
    MatIcon,
    MatButton,
    MatMiniFabButton,
  ],
})
export class SessionPropertiesComponent {

  private readonly _snackbar = inject(MatSnackBar);
  private readonly _clipboard = inject(Clipboard);

  protected readonly sessionProperties = obfuscateSecrets(inject<SessionProperties>(MAT_SNACK_BAR_DATA));

  protected onClose(): void {
    this._snackbar.dismiss();
  }

  protected onCopyToClipboard(): void {
    this._clipboard.copy(JSON.stringify(this.sessionProperties));
  }
}

function obfuscateSecrets(sessionProperties: SessionProperties): SessionProperties {
  const obfuscated = {...sessionProperties}; // eslint-disable-line @typescript-eslint/no-misused-spread
  if (obfuscated.password) {
    obfuscated.password = '***';
  }
  if (obfuscated.accessToken) {
    obfuscated.accessToken = '***';
  }
  return obfuscated;
}
