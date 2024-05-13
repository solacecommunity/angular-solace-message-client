import {Component, Inject} from '@angular/core';
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
  standalone: true,
  imports: [
    KeyValuePipe,
    MatIconModule,
    MatButtonModule,
  ],
})
export class SessionPropertiesComponent {

  public sessionProperties: SessionProperties;

  constructor(@Inject(MAT_SNACK_BAR_DATA) sessionProperties: SessionProperties,
              private _snackbar: MatSnackBar,
              private _clipboard: Clipboard) {
    this.sessionProperties = obfuscateSecrets(sessionProperties);
  }

  public onClose(): void {
    this._snackbar.dismiss();
  }

  public onCopyToClipboard(): void {
    this._clipboard.copy(JSON.stringify(this.sessionProperties));
  }
}

function obfuscateSecrets(sessionProperties: SessionProperties): SessionProperties {
  const obfuscated = {...sessionProperties};
  if (obfuscated.password) {
    obfuscated.password = '***';
  }
  if (obfuscated.accessToken) {
    obfuscated.accessToken = '***';
  }
  return obfuscated;
}

