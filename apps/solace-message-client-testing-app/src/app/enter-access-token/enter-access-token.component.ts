import {Component, inject} from '@angular/core';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {PromptAccessTokenProvider} from '../prompt-access-token.provider';
import {MatFormField, MatInput} from '@angular/material/input';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-enter-access-token',
  templateUrl: './enter-access-token.component.html',
  styleUrls: ['./enter-access-token.component.scss'],
  imports: [
    MatDialogTitle,
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatDialogActions,
    MatButton,
  ],
})
export class EnterAccessTokenComponent {

  private readonly _dialogRef = inject(MatDialogRef);
  private readonly _accessTokenProvider = inject(PromptAccessTokenProvider);

  protected readonly accessTokenFormControl = new FormControl('', {validators: Validators.required, nonNullable: true});

  protected onCancel(): void {
    this._dialogRef.close();
  }

  protected onOk(): void {
    this._accessTokenProvider.updateAccessToken(this.accessTokenFormControl.value);
    this._dialogRef.close();
  }
}
