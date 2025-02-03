import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
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

export const URL = 'url';
export const VPN_NAME = 'vpnName';
export const AUTHENTICATION_SCHEME = 'authenticationScheme';
export const USER_NAME = 'userName';
export const PASSWORD = 'password';
export const REAPPLY_SUBSCRIPTIONS = 'reapplySubscriptions';
export const RECONNECT_RETRIES = 'reconnectRetries';

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
  private readonly _formBuilder = inject(FormBuilder);

  protected readonly URL = URL;
  protected readonly VPN_NAME = VPN_NAME;
  protected readonly AUTHENTICATION_SCHEME = AUTHENTICATION_SCHEME;
  protected readonly USER_NAME = USER_NAME;
  protected readonly PASSWORD = PASSWORD;
  protected readonly REAPPLY_SUBSCRIPTIONS = REAPPLY_SUBSCRIPTIONS;
  protected readonly RECONNECT_RETRIES = RECONNECT_RETRIES;
  protected readonly AuthenticationScheme = AuthenticationScheme;

  protected readonly form = new FormGroup({
    [URL]: this._formBuilder.control('wss://public.messaging.solace.cloud:443', {validators: Validators.required, nonNullable: true}),
    [VPN_NAME]: this._formBuilder.control('public', {validators: Validators.required, nonNullable: true}),
    [AUTHENTICATION_SCHEME]: this._formBuilder.control(AuthenticationScheme.BASIC),
    [USER_NAME]: this._formBuilder.control('angular'),
    [PASSWORD]: this._formBuilder.control('public'),
    [REAPPLY_SUBSCRIPTIONS]: this._formBuilder.control(true),
    [RECONNECT_RETRIES]: this._formBuilder.control(-1),
  });

  constructor() {
    this.installAuthenticationSchemeChangeListener();
  }

  protected onLogin(): void {
    const oAuthEnabled = this.form.get(AUTHENTICATION_SCHEME)!.value === AuthenticationScheme.OAUTH2;
    const sessionConfig: SolaceMessageClientConfig = {
      url: this.form.get(URL)!.value,
      vpnName: this.form.get(VPN_NAME)!.value as string | undefined,
      userName: this.form.get(USER_NAME)!.value as string | undefined,
      password: this.form.get(PASSWORD)!.value as string | undefined,
      reapplySubscriptions: this.form.get(REAPPLY_SUBSCRIPTIONS)!.value as boolean | undefined,
      reconnectRetries: this.form.get(RECONNECT_RETRIES)!.value as number | undefined,
      connectRetries: this.form.get(RECONNECT_RETRIES)!.value as number | undefined,
      authenticationScheme: this.form.get(AUTHENTICATION_SCHEME)!.value as AuthenticationScheme | undefined,
      accessToken: oAuthEnabled ? promptForAccessToken : undefined,
    };

    SessionConfigStore.store(sessionConfig);
    this._locationService.navigateToAppRoot({clearConnectProperties: false});
  }

  protected onReset(): void {
    this.form.reset();
  }

  private installAuthenticationSchemeChangeListener(): void {
    this.form.get(AUTHENTICATION_SCHEME)!.valueChanges
      .pipe(
        startWith(undefined),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const basicAuthFormControls = [this.form.get(USER_NAME)!, this.form.get(PASSWORD)!];
        const basicAuthEnabled = this.form.get(AUTHENTICATION_SCHEME)!.value === AuthenticationScheme.BASIC;

        basicAuthFormControls.forEach(formControl => {
          basicAuthEnabled ? formControl.addValidators(Validators.required) : formControl.removeValidators(Validators.required);
          formControl.updateValueAndValidity();
        });
      });
  }
}
