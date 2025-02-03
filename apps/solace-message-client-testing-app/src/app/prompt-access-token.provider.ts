import {OAuthAccessTokenFn} from '@solace-community/angular-solace-message-client';
import {Observable, ReplaySubject} from 'rxjs';
import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {EnterAccessTokenComponent} from './enter-access-token/enter-access-token.component';

/**
 * Prompts the user for an access token.
 */
@Injectable({providedIn: 'root'})
export class PromptAccessTokenProvider {

  private readonly _matDialog = inject(MatDialog);
  private readonly _accessToken$ = new ReplaySubject<string>(1);

  private _empty = true;

  public provide$(): Observable<string> {
    // If not provided an access token yet, prompt for input.
    if (this._empty) {
      this._matDialog.open(EnterAccessTokenComponent);
    }
    return this._accessToken$;
  }

  public updateAccessToken(accessToken: string): void {
    this._empty = false;
    this._accessToken$.next(accessToken);
  }
}

/**
 * Prompts the user for an access token.
 */
export const promptForAccessToken: OAuthAccessTokenFn = (): Observable<string> => {
  return inject(PromptAccessTokenProvider).provide$();
};
