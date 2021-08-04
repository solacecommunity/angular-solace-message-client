import { ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageEnvelope, SolaceMessageClient } from 'solace-message-client';
import { Subject, Subscription } from 'rxjs';
import { filter, finalize, takeUntil } from 'rxjs/operators';
import { SciViewportComponent } from '@scion/toolkit/viewport';

export const TOPIC = 'topic';
export const SUBSCRIPTION = 'subscription';
export const FOLLOW_TAIL = 'followTail';

@Component({
  selector: 'app-subscriber',
  templateUrl: './subscriber.component.html',
  styleUrls: ['./subscriber.component.scss'],
})
export class SubscriberComponent implements OnDestroy {

  public readonly TOPIC = TOPIC;
  public readonly SUBSCRIPTION = SUBSCRIPTION;
  public readonly FOLLOW_TAIL = FOLLOW_TAIL;

  public form: FormGroup;
  public subscribeError: string;
  public envelopes: MessageEnvelope[] = [];

  private _subscription: Subscription;
  private _destroy$ = new Subject<void>();

  @ViewChild(SciViewportComponent)
  private _viewport: SciViewportComponent;

  constructor(public solaceMessageClient: SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [SUBSCRIPTION]: new FormGroup({
        [TOPIC]: new FormControl('', Validators.required),
      }),
      [FOLLOW_TAIL]: new FormControl(true),
    });
    this.installFollowTailListener();
  }

  public onSubscribe(): void {
    this.form.get(SUBSCRIPTION).disable();
    this.subscribeError = null;

    try {
      this._subscription = this.solaceMessageClient.observe$(this.form.get([SUBSCRIPTION, TOPIC]).value)
        .pipe(finalize(() => this.form.get(SUBSCRIPTION).enable()))
        .subscribe(
          (envelope: MessageEnvelope) => {
            this.envelopes = this.envelopes.concat(envelope);

            if (this.form.get(FOLLOW_TAIL).value) {
              this._cd.detectChanges();
              this.scrollToEnd();
            }
          },
          error => this.subscribeError = error.toString(),
        );
    }
    catch (error) {
      this.form.get(SUBSCRIPTION).enable();
      this.subscribeError = error;
    }
  }

  public onUnsubscribe(): void {
    this._subscription && this._subscription.unsubscribe();
    this._subscription = null;
  }

  public onClear(): void {
    this.envelopes = [];
  }

  public onDelete(envelope: MessageEnvelope): void {
    this.envelopes = this.envelopes.filter(it => it !== envelope);
  }

  public get isSubscribed(): boolean {
    return this._subscription && !this._subscription.closed;
  }

  private scrollToEnd(): void {
    this._viewport.scrollTop = this._viewport.scrollHeight;
  }

  private installFollowTailListener(): void {
    this.form.get(FOLLOW_TAIL).valueChanges
      .pipe(
        filter(Boolean),
        takeUntil(this._destroy$),
      )
      .subscribe(() => {
        this.scrollToEnd();
      });
  }

  public ngOnDestroy(): void {
    this._destroy$.next();
  }
}
