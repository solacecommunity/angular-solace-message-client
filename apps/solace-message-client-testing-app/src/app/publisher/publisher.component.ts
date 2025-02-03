import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DestinationType, MessageDeliveryModeType, MessageType, SDTField, SDTFieldType, SolclientFactory} from 'solclientjs';
import {Data, MessageEnvelope, PublishOptions, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {defer, Observable, Subscription, tap, throwError} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {Arrays} from '@scion/toolkit/util';
import {MatCardModule} from '@angular/material/card';
import {SciViewportComponent} from '@scion/components/viewport';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MessageListItemComponent} from '../message-list-item/message-list-item.component';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

export const DESTINATION = 'destination';
export const DESTINATION_TYPE = 'destinationType';
export const DELIVERY_MODE = 'deliveryMode';
export const MESSAGE = 'message';
export const MESSAGE_TYPE = 'messageType';
export const HEADERS = 'headers';
export const REQUEST_REPLY = 'request/reply';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    SciViewportComponent,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatInputModule,
    MatButtonModule,
    MessageListItemComponent,
  ],
})
export class PublisherComponent {

  private readonly _solaceMessageClient = inject(SolaceMessageClient);
  private readonly _cd = inject(ChangeDetectorRef);
  private readonly _formBuilder = inject(FormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly DESTINATION = DESTINATION;
  protected readonly DESTINATION_TYPE = DESTINATION_TYPE;
  protected readonly DELIVERY_MODE = DELIVERY_MODE;
  protected readonly MESSAGE = MESSAGE;
  protected readonly MESSAGE_TYPE = MESSAGE_TYPE;
  protected readonly HEADERS = HEADERS;
  protected readonly REQUEST_REPLY = REQUEST_REPLY;

  protected readonly MessageType = MessageType;
  protected readonly DestinationType = DestinationType;
  protected readonly MessageDeliveryModeType = MessageDeliveryModeType;

  protected readonly form = new FormGroup({
    [DESTINATION]: this._formBuilder.control('', Validators.required),
    [DESTINATION_TYPE]: this._formBuilder.control(DestinationType.TOPIC, Validators.required),
    [DELIVERY_MODE]: this._formBuilder.control(undefined),
    [MESSAGE]: this._formBuilder.control(''),
    [MESSAGE_TYPE]: this._formBuilder.control(MessageType.BINARY, Validators.required),
    [HEADERS]: this._formBuilder.control(''),
    [REQUEST_REPLY]: this._formBuilder.control(false),
  });

  private _publishSubscription: Subscription | null = null;

  protected publishError: string | null = null;
  protected replies: MessageEnvelope[] = [];

  protected async onPublish(): Promise<void> {
    this.form.disable();
    this.publishError = null;
    this._publishSubscription = this.publish$()
      .pipe(
        tap({
          next: () => this._cd.markForCheck(),
          error: () => this._cd.markForCheck(),
          complete: () => this._cd.markForCheck(),
        }),
        finalize(() => {
          this.form.enable();
          this._publishSubscription = null;
        }),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe({
        error: (error: unknown) => this.publishError = `${error}`, // eslint-disable-line @typescript-eslint/restrict-template-expressions
      });
  }

  protected onCancelPublish(): void {
    this._publishSubscription?.unsubscribe();
    this._publishSubscription = null;
    this.replies.length = 0;
  }

  protected onClearReplies(): void {
    this.replies.length = 0;
  }

  private publish$(): Observable<any> {
    try {
      const destination = this.form.get(DESTINATION)!.value!;
      const destinationType = this.form.get(DESTINATION_TYPE)!.value;
      const message: Data | undefined = this.readMessageFromUI();
      const publishOptions: PublishOptions = this.readPublishOptionsFromUI();

      switch (destinationType) {
        case DestinationType.TOPIC: {
          const topicDestination = SolclientFactory.createTopicDestination(destination);
          if (this.requestReply) {
            return this._solaceMessageClient.request$(topicDestination, message)
              .pipe(tap(reply => this.replies.push(reply)));
          }
          else {
            return defer(() => this._solaceMessageClient.publish(topicDestination, message, publishOptions));
          }
        }
        case DestinationType.QUEUE: {
          const queueDestination = SolclientFactory.createDurableQueueDestination(destination);
          if (this.requestReply) {
            return this._solaceMessageClient.request$(queueDestination, message, publishOptions)
              .pipe(tap(reply => this.replies.push(reply)));
          }
          else {
            return defer(() => this._solaceMessageClient.publish(queueDestination, message, publishOptions));
          }
        }
        default: {
          return throwError(() => `Unsupported destination type: ${destinationType}`);
        }
      }
    }
    catch (error) {
      return throwError(() => error);
    }
  }

  protected onDeleteReply(reply: MessageEnvelope): void {
    Arrays.remove(this.replies, reply);
  }

  protected get requestReply(): boolean {
    return this.form.get(REQUEST_REPLY)!.value!;
  }

  protected get publishing(): boolean {
    return this._publishSubscription !== null;
  }

  private readPublishOptionsFromUI(): PublishOptions {
    return {
      headers: this.readHeadersFromUI(),
      deliveryMode: this.form.get(DELIVERY_MODE)!.value! as MessageDeliveryModeType,
    };
  }

  private readMessageFromUI(): Data | undefined {
    const message = this.form.get(MESSAGE)!.value as string | undefined;
    if (!message) {
      return undefined;
    }

    if (this.form.get(MESSAGE_TYPE)!.value === MessageType.TEXT) {
      return SDTField.create(SDTFieldType.STRING, message); // structuredTextMessage
    }
    else {
      return new TextEncoder().encode(message); // binary message
    }
  }

  private readHeadersFromUI(): Map<string, string | boolean | number> | undefined {
    const headers = this.form.get(HEADERS)!.value!;
    if (!headers.length) {
      return undefined;
    }

    const headerMap = new Map<string, string | boolean | number>();
    headers.split(';').forEach(keyValue => {
      const [key, value] = keyValue.split('->');
      if (value === 'true' || value === 'false') {
        headerMap.set(key, Boolean(value));
      }
      else if (!Number.isNaN(Number(value))) {
        headerMap.set(key, Number(value));
      }
      else {
        headerMap.set(key, value);
      }
    });
    return headerMap;
  }
}
