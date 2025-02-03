import {ChangeDetectorRef, Component, DestroyRef, EventEmitter, inject, Output, ViewChild} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MessageEnvelope, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Observable, Subscription} from 'rxjs';
import {filter, finalize} from 'rxjs/operators';
import {SciViewportComponent} from '@scion/components/viewport';
import {Message, QueueDescriptor, QueueType} from 'solclientjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MessageListItemComponent} from '../message-list-item/message-list-item.component';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {AutofocusDirective} from '../autofocus.directive';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

export const DESTINATION = 'destination';
export const DESTINATION_TYPE = 'destinationType';
export const SUBSCRIPTION = 'subscription';
export const FOLLOW_TAIL = 'followTail';

@Component({
  selector: 'app-subscriber',
  templateUrl: './subscriber.component.html',
  styleUrls: ['./subscriber.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MessageListItemComponent,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    SciViewportComponent,
    AutofocusDirective,
  ],
})
export class SubscriberComponent {

  private readonly _solaceMessageClient = inject(SolaceMessageClient);
  private readonly _cd = inject(ChangeDetectorRef);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    [SUBSCRIPTION]: new FormGroup({
      [DESTINATION]: new FormControl('', {validators: Validators.required, nonNullable: true}),
      [DESTINATION_TYPE]: new FormControl(SubscriptionDestinationType.TOPIC, {validators: Validators.required, nonNullable: true}),
    }),
    [FOLLOW_TAIL]: new FormControl(true),
  });

  protected readonly DESTINATION = DESTINATION;
  protected readonly DESTINATION_TYPE = DESTINATION_TYPE;
  protected readonly SUBSCRIPTION = SUBSCRIPTION;
  protected readonly FOLLOW_TAIL = FOLLOW_TAIL;
  protected readonly SubscriptionDestinationType = SubscriptionDestinationType;
  protected readonly tooltips = {
    topic: 'Subscribes to messages published to the given topic.',
    queue: 'Subscribes for messages sent to the given durable queue. The queue needs to be administratively configured on the broker.',
    topicEndpoint: `Subscribes to a non-durable topic endpoint (similar to a queue) that subscribes to the given topic destination. The topic endpoint needs NOT to be configured on the broker.

                    Unlike a durable endpoint, the lifecycle of a non-durable endpoint (also known as a private, temporary endpoint) is bound to the client that created it, with an additional 60s in case of unexpected disconnect.

                    Topic endpoints in particular are useful for not losing messages in the event of short connection interruptions as messages are retained on the broker until they are consumed.`,
    queueBrowser: `Browses messages in a queue, without removing/consuming the messages.`,
  };

  private _subscription: Subscription | null = null;

  protected subscribeError: string | null = null;
  protected envelopes: MessageEnvelope[] = [];

  @ViewChild(SciViewportComponent, {static: true})
  private _viewport!: SciViewportComponent;

  @Output()
  public destination = new EventEmitter<string>();

  constructor() {
    this.installDestinationEmitter();
    this.installFollowTailListener();
  }

  protected onSubscribe(): void {
    this.form.get(SUBSCRIPTION)!.disable();
    this.subscribeError = null;

    const destination = this.form.get([SUBSCRIPTION, DESTINATION])!.value as string;
    const destinationType = this.form.get([SUBSCRIPTION, DESTINATION_TYPE])!.value as SubscriptionDestinationType;

    try {
      const message$: Observable<MessageEnvelope> = (() => {
        switch (destinationType) {
          case SubscriptionDestinationType.TOPIC: {
            return this._solaceMessageClient.observe$(destination);
          }
          case SubscriptionDestinationType.QUEUE: {
            return this._solaceMessageClient.consume$({
              queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: destination}),
            });
          }
          case SubscriptionDestinationType.TOPIC_ENDPOINT: {
            return this._solaceMessageClient.consume$(destination);
          }
          case SubscriptionDestinationType.QUEUE_BROWSER: {
            return this._solaceMessageClient.browse$(destination);
          }
        }
      })();

      this._subscription = message$
        .pipe(
          finalize(() => this.form.get(SUBSCRIPTION)!.enable()),
          takeUntilDestroyed(this._destroyRef),
        )
        .subscribe({
          next: (envelope: MessageEnvelope) => {
            this.envelopes = this.envelopes.concat(envelope);

            if (this.form.get(FOLLOW_TAIL)!.value) {
              this._cd.detectChanges();
              this.scrollToEnd();
            }
          },
          error: error => this.subscribeError = `${error}`,
        });
    }
    catch (error: unknown) {
      this.form.get(SUBSCRIPTION)!.enable();
      this.subscribeError = `${error}`; // eslint-disable-line @typescript-eslint/restrict-template-expressions
    }
  }

  protected onUnsubscribe(): void {
    this._subscription?.unsubscribe();
    this._subscription = null;
  }

  protected onClear(): void {
    this.envelopes = [];
  }

  protected onDelete(envelope: MessageEnvelope): void {
    this.envelopes = this.envelopes.filter(it => it !== envelope);
  }

  protected onReply(messageToReplyTo: Message): void {
    this._solaceMessageClient.reply(messageToReplyTo, 'this is a reply')
      .catch((error: unknown) => this.subscribeError = `${error}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }

  protected get isSubscribed(): boolean {
    return (this._subscription && !this._subscription.closed) ?? false;
  }

  private scrollToEnd(): void {
    this._viewport.scrollTop = this._viewport.scrollHeight;
  }

  private installDestinationEmitter(): void {
    this.form.get([SUBSCRIPTION, DESTINATION])!.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(this.destination);
  }

  private installFollowTailListener(): void {
    this.form.get(FOLLOW_TAIL)!.valueChanges
      .pipe(
        filter(Boolean),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.scrollToEnd();
      });
  }
}

export enum SubscriptionDestinationType {
  QUEUE = 'QUEUE',
  TOPIC = 'TOPIC',
  TOPIC_ENDPOINT = 'TOPIC_ENDPOINT',
  QUEUE_BROWSER = 'QUEUE_BROWSER',
}
