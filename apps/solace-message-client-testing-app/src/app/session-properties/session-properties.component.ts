import { Component, Inject } from '@angular/core';
import { SessionProperties } from 'solace-message-client';
import { MAT_SNACK_BAR_DATA, MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-session-properties',
  templateUrl: './session-properties.component.html',
  styleUrls: ['./session-properties.component.scss'],
})
export class SessionPropertiesComponent {

  constructor(@Inject(MAT_SNACK_BAR_DATA)
              public sessionProperties: SessionProperties,
              private _snackbar: MatSnackBar,
              private _clipboard: Clipboard) {
  }

  public onClose(): void {
    this._snackbar.dismiss();
  }

  public onCopyToClipboard(): void {
    this._clipboard.copy(JSON.stringify(this.sessionProperties));
  }
}

