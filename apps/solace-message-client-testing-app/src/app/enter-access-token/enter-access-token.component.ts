import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';
import {PromptAccessTokenProvider} from '../prompt-access-token.provider';

@Component({
  selector: 'app-enter-access-token',
  templateUrl: './enter-access-token.component.html',
  styleUrls: ['./enter-access-token.component.scss'],
})
export class EnterAccessTokenComponent {

  public accessTokenFormControl = new FormControl('', {validators: Validators.required, nonNullable: true});

  constructor(private _dialogRef: MatDialogRef<void>,
              private _accessTokenProvider: PromptAccessTokenProvider) {
  }

  public onCancel(): void {
    this._dialogRef.close();
  }

  public onOk(): void {
    this._accessTokenProvider.updateAccessToken(this.accessTokenFormControl.value);
    this._dialogRef.close();
  }
}
