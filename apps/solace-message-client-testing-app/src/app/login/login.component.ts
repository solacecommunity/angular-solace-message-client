import {Component, OnDestroy} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {LocationService} from '../location.service';
import {SolaceMessageClientConfig} from '@solace-community/angular-solace-message-client';
import {SessionConfigStore} from '../session-config-store';
import {AuthenticationScheme} from 'solclientjs';
import {PromptAccessTokenProvider} from '../prompt-access-token.provider';
import {startWith, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

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
})
export class LoginComponent implements OnDestroy {

  public readonly URL = URL;
  public readonly VPN_NAME = VPN_NAME;
  public readonly AUTHENTICATION_SCHEME = AUTHENTICATION_SCHEME;
  public readonly USER_NAME = USER_NAME;
  public readonly PASSWORD = PASSWORD;
  public readonly REAPPLY_SUBSCRIPTIONS = REAPPLY_SUBSCRIPTIONS;
  public readonly RECONNECT_RETRIES = RECONNECT_RETRIES;

  public form: FormGroup;
  public AuthenticationScheme = AuthenticationScheme;

  private _destroy$ = new Subject<void>();

  constructor(formBuilder: FormBuilder,
              private _locationService: LocationService) {
    this.form = new FormGroup({
      [URL]: formBuilder.control('', Validators.required),
      [VPN_NAME]: formBuilder.control('', Validators.required),
      [AUTHENTICATION_SCHEME]: formBuilder.control(AuthenticationScheme.BASIC),
      [USER_NAME]: formBuilder.control(''),
      [PASSWORD]: formBuilder.control(''),
      [REAPPLY_SUBSCRIPTIONS]: formBuilder.control(true),
      [RECONNECT_RETRIES]: formBuilder.control(-1),
    });
    this.installAuthenticationSchemeChangeListener();
  }

  public onLogin(): void {
    const oAuthEnabled = this.form.get(AUTHENTICATION_SCHEME)!.value === AuthenticationScheme.OAUTH2;
    const sessionConfig: SolaceMessageClientConfig = {
      url: this.form.get(URL)!.value ?? undefined,
      vpnName: this.form.get(VPN_NAME)!.value ?? undefined,
      userName: this.form.get(USER_NAME)!.value ?? undefined,
      password: this.form.get(PASSWORD)!.value ?? undefined,
      reapplySubscriptions: this.form.get(REAPPLY_SUBSCRIPTIONS)!.value ?? undefined,
      reconnectRetries: this.form.get(RECONNECT_RETRIES)!.value ?? undefined,
      connectRetries: this.form.get(RECONNECT_RETRIES)!.value ?? undefined,
      authenticationScheme: this.form.get(AUTHENTICATION_SCHEME)!.value ?? undefined,
      accessToken: oAuthEnabled ? PromptAccessTokenProvider : undefined,
    };

    SessionConfigStore.store(sessionConfig);
    this._locationService.navigateToAppRoot({clearConnectProperties: false});
  }

  public onReset(): void {
    this.form.reset();
  }

  private installAuthenticationSchemeChangeListener(): void {
    this.form.get(AUTHENTICATION_SCHEME)!.valueChanges
      .pipe(
        startWith(undefined),
        takeUntil(this._destroy$),
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

  public ngOnDestroy(): void {
    this._destroy$.next();
  }
}

