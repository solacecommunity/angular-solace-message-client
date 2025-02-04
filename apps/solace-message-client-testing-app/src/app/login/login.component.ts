import {Component, inject} from '@angular/core';
import {NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {LocationService} from '../location.service';
import {SolaceMessageClientConfig} from '@solace-community/angular-solace-message-client';
import {SessionConfigStore} from '../session-config-store';
import {AuthenticationScheme} from 'solclientjs';
import {promptForAccessToken} from '../prompt-access-token.provider';
import {startWith} from 'rxjs';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
})
export class LoginComponent {

  private readonly _locationService = inject(LocationService);
  private readonly _formBuilder = inject(NonNullableFormBuilder);

  protected readonly AuthenticationScheme = AuthenticationScheme;

  protected readonly form = this._formBuilder.group({
    url: this._formBuilder.control('wss://public.messaging.solace.cloud:443', {validators: Validators.required}),
    vpnName: this._formBuilder.control('public', {validators: Validators.required}),
    authenticationScheme: this._formBuilder.control(AuthenticationScheme.BASIC, {validators: Validators.required}),
    userName: this._formBuilder.control('public'),
    password: this._formBuilder.control('public'),
    reapplySubscriptions: this._formBuilder.control(true),
    reconnectRetries: this._formBuilder.control(-1),
  });

  constructor() {
    this.installAuthenticationSchemeChangeListener();
  }

  protected onLogin(): void {
    const oAuthEnabled = this.form.controls.authenticationScheme.value === AuthenticationScheme.OAUTH2;
    const sessionConfig: SolaceMessageClientConfig = {
      url: this.form.controls.url.value,
      vpnName: this.form.controls.vpnName.value,
      userName: this.form.controls.userName.value,
      password: this.form.controls.password.value,
      reapplySubscriptions: this.form.controls.reapplySubscriptions.value,
      reconnectRetries: this.form.controls.reconnectRetries.value,
      connectRetries: this.form.controls.reconnectRetries.value,
      authenticationScheme: this.form.controls.authenticationScheme.value,
      accessToken: oAuthEnabled ? promptForAccessToken : undefined,
    };

    SessionConfigStore.store(sessionConfig);
    this._locationService.navigateToAppRoot({clearConnectProperties: false});
  }

  protected onReset(): void {
    this.form.reset();
  }

  private installAuthenticationSchemeChangeListener(): void {
    this.form.controls.authenticationScheme.valueChanges
      .pipe(
        startWith(undefined),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const basicAuthFormControls = [this.form.controls.userName, this.form.controls.password];
        const basicAuthEnabled = this.form.controls.authenticationScheme.value === AuthenticationScheme.BASIC;

        basicAuthFormControls.forEach(formControl => {
          basicAuthEnabled ? formControl.addValidators(Validators.required) : formControl.removeValidators(Validators.required);
          formControl.updateValueAndValidity();
        });
      });
  }
}
