import {Component} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SessionProperties} from '@solace-community/angular-solace-message-client';
import {SOLACE_CONNECT_PROPERTIES_SESSION_KEY} from '../constants';
import {LocationService} from '../location.service';

export const URL = 'url';
export const VPN_NAME = 'vpnName';
export const USER_NAME = 'userName';
export const PASSWORD = 'password';
export const REAPPLY_SUBSCRIPTIONS = 'reapplySubscriptions';
export const RECONNECT_RETRIES = 'reconnectRetries';

@Component({
  selector: 'app-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss'],
})
export class ConnectComponent {

  public readonly URL = URL;
  public readonly VPN_NAME = VPN_NAME;
  public readonly USER_NAME = USER_NAME;
  public readonly PASSWORD = PASSWORD;
  public readonly REAPPLY_SUBSCRIPTIONS = REAPPLY_SUBSCRIPTIONS;
  public readonly RECONNECT_RETRIES = RECONNECT_RETRIES;

  public form: FormGroup;

  constructor(formBuilder: FormBuilder,
              private _locationService: LocationService) {
    this.form = new FormGroup({
      [URL]: formBuilder.control('wss://mr-xxxxxxx.messaging.solace.cloud:443', Validators.required),
      [VPN_NAME]: formBuilder.control('default', Validators.required),
      [USER_NAME]: formBuilder.control('default', Validators.required),
      [PASSWORD]: formBuilder.control('default', Validators.required),
      [REAPPLY_SUBSCRIPTIONS]: formBuilder.control(true),
      [RECONNECT_RETRIES]: formBuilder.control(-1),
    });
  }

  public onConnect(): void {
    const solaceConnectProperties: SessionProperties = {
      url: this.form.get(URL)!.value ?? undefined,
      vpnName: this.form.get(VPN_NAME)!.value ?? undefined,
      userName: this.form.get(USER_NAME)!.value ?? undefined,
      password: this.form.get(PASSWORD)!.value ?? undefined,
      reapplySubscriptions: this.form.get(REAPPLY_SUBSCRIPTIONS)!.value ?? undefined,
      reconnectRetries: this.form.get(RECONNECT_RETRIES)!.value ?? undefined,
      connectRetries: this.form.get(RECONNECT_RETRIES)!.value ?? undefined,
      generateReceiveTimestamps: true,
    };

    localStorage.setItem(SOLACE_CONNECT_PROPERTIES_SESSION_KEY, JSON.stringify(solaceConnectProperties));
    this._locationService.navigateToAppRoot({clearConnectProperties: false});
  }

  public onReset(): void {
    this.form.reset();
  }
}

