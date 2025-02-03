import {Component, inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA, MatSnackBar} from '@angular/material/snack-bar';
import {Clipboard} from '@angular/cdk/clipboard';
import {SessionProperties} from 'solclientjs';
import {KeyValuePipe} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-session-properties',
  templateUrl: './session-properties.component.html',
  styleUrls: ['./session-properties.component.scss'],
  imports: [
    KeyValuePipe,
    MatIconModule,
    MatButtonModule,
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
