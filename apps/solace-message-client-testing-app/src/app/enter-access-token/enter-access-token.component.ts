import {Component} from '@angular/core';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {PromptAccessTokenProvider} from '../prompt-access-token.provider';
import {MatInputModule} from '@angular/material/input';
import {A11yModule} from '@angular/cdk/a11y';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-enter-access-token',
  templateUrl: './enter-access-token.component.html',
  styleUrls: ['./enter-access-token.component.scss'],
  imports: [
    MatDialogTitle,
    MatDialogContent,
    ReactiveFormsModule,
    MatInputModule,
    A11yModule,
    MatDialogActions,
    MatButtonModule,
  ],
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
