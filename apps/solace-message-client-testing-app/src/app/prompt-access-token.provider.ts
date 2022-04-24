import {OAuthAccessTokenProvider} from '@solace-community/angular-solace-message-client';
import {Observable, ReplaySubject} from 'rxjs';
import {Injectable, NgZone} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {EnterAccessTokenComponent} from './enter-access-token/enter-access-token.component';

/**
 * Prompts the user for an access token.
 */
@Injectable({providedIn: 'root'})
export class PromptAccessTokenProvider implements OAuthAccessTokenProvider {

  private _empty = true;
  private _accessToken$ = new ReplaySubject<string>(1);

  constructor(private _matDialog: MatDialog, private _zone: NgZone) {
  }

  public provide$(): Observable<string> {
    // If not provided an access token yet, prompt for input.
    if (this._empty) {
      this._zone.run(() => this._matDialog.open(EnterAccessTokenComponent));
    }
    return this._accessToken$;
  }

  public updateAccessToken(accessToken: string): void {
    this._empty = false;
    this._accessToken$.next(accessToken);
  }
}
