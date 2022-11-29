import {ChangeDetectorRef, Component, EventEmitter, OnDestroy, Output, ViewChild} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MessageEnvelope, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Observable, Subject, Subscription} from 'rxjs';
import {filter, finalize, takeUntil} from 'rxjs/operators';
import {SciViewportComponent} from '@scion/components/viewport';
import {Message, QueueDescriptor, QueueType} from 'solclientjs';

export const DESTINATION = 'destination';
export const DESTINATION_TYPE = 'destinationType';
export const SUBSCRIPTION = 'subscription';
export const FOLLOW_TAIL = 'followTail';

@Component({
  selector: 'app-subscriber',
  templateUrl: './subscriber.component.html',
  styleUrls: ['./subscriber.component.scss'],
})
export class SubscriberComponent implements OnDestroy {

  public readonly DESTINATION = DESTINATION;
  public readonly DESTINATION_TYPE = DESTINATION_TYPE;
  public readonly SUBSCRIPTION = SUBSCRIPTION;
  public readonly FOLLOW_TAIL = FOLLOW_TAIL;

  public form: FormGroup;
  public subscribeError: string | null = null;
  public envelopes: MessageEnvelope[] = [];
  public tooltips = {
    topic: 'Subscribes to messages published to the given topic.',
    queue: 'Subscribes for messages sent to the given durable queue. The queue needs to be administratively configured on the broker.',
    topicEndpoint: `Subscribes to a non-durable topic endpoint (similar to a queue) that subscribes to the given topic destination. The topic endpoint needs NOT to be configured on the broker.

                    Unlike a durable endpoint, the lifecycle of a non-durable endpoint (also known as a private, temporary endpoint) is bound to the client that created it, with an additional 60s in case of unexpected disconnect.

                    Topic endpoints in particular are useful for not losing messages in the event of short connection interruptions as messages are retained on the broker until they are consumed.`,
    queueBrowser: `Browses messages in a queue, without removing/consuming the messages.`,
  };

  private _subscription: Subscription | null = null;
  private _destroy$ = new Subject<void>();

  @ViewChild(SciViewportComponent, {static: true})
  private _viewport!: SciViewportComponent;

  @Output()
  public destination = new EventEmitter<string>();

  public SubscriptionDestinationType = SubscriptionDestinationType;

  constructor(private _solaceMessageClient: SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [SUBSCRIPTION]: new FormGroup({
        [DESTINATION]: new FormControl('', {validators: Validators.required, nonNullable: true}),
        [DESTINATION_TYPE]: new FormControl(SubscriptionDestinationType.TOPIC, {validators: Validators.required, nonNullable: true}),
      }),
      [FOLLOW_TAIL]: new FormControl(true),
    });
    this.installDestinationEmitter();
    this.installFollowTailListener();
  }

  public onSubscribe(): void {
    this.form.get(SUBSCRIPTION)!.disable();
    this.subscribeError = null;

    const destination: string = this.form.get([SUBSCRIPTION, DESTINATION])!.value;
    const destinationType: SubscriptionDestinationType = this.form.get([SUBSCRIPTION, DESTINATION_TYPE])!.value;

    try {
      const message$: Observable<MessageEnvelope> = (() => {
        switch (destinationType) {
          case SubscriptionDestinationType.TOPIC: {
            return this._solaceMessageClient.observe$(destination);
          }
          case SubscriptionDestinationType.QUEUE: {
            return this._solaceMessageClient.consume$({
              queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: destination}),
              // FIXME typedef(solclientjs): remove 'queueProperties' when changed 'queueProperties' to optional
              queueProperties: undefined,
            });
          }
          case SubscriptionDestinationType.TOPIC_ENDPOINT: {
            return this._solaceMessageClient.consume$(destination);
          }
          case SubscriptionDestinationType.QUEUE_BROWSER: {
            return this._solaceMessageClient.browse$(destination);
          }
          default: {
            throw Error(`[UnsupportedDestinationError] Expected '${SubscriptionDestinationType.TOPIC}', '${SubscriptionDestinationType.QUEUE}', '${SubscriptionDestinationType.TOPIC_ENDPOINT}', or '${SubscriptionDestinationType.QUEUE_BROWSER}', but was ${destinationType}`);
          }
        }
      })();

      this._subscription = message$
        .pipe(
          finalize(() => this.form.get(SUBSCRIPTION)!.enable()),
          takeUntil(this._destroy$),
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
    catch (error) {
      this.form.get(SUBSCRIPTION)!.enable();
      this.subscribeError = `${error}`;
    }
  }

  public onUnsubscribe(): void {
    this._subscription?.unsubscribe();
    this._subscription = null;
  }

  public onClear(): void {
    this.envelopes = [];
  }

  public onDelete(envelope: MessageEnvelope): void {
    this.envelopes = this.envelopes.filter(it => it !== envelope);
  }

  public onReply(messageToReplyTo: Message): void {
    this._solaceMessageClient.reply(messageToReplyTo, 'this is a reply')
      .catch(error => this.subscribeError = `${error}`);
  }

  public get isSubscribed(): boolean {
    return (this._subscription && !this._subscription.closed) ?? false;
  }

  private scrollToEnd(): void {
    this._viewport.scrollTop = this._viewport.scrollHeight;
  }

  private installDestinationEmitter(): void {
    this.form.get([SUBSCRIPTION, DESTINATION])!.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(this.destination);
  }

  private installFollowTailListener(): void {
    this.form.get(FOLLOW_TAIL)!.valueChanges
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

export enum SubscriptionDestinationType {
  QUEUE = 'QUEUE',
  TOPIC = 'TOPIC',
  TOPIC_ENDPOINT = 'TOPIC_ENDPOINT',
  QUEUE_BROWSER = 'QUEUE_BROWSER',
}
