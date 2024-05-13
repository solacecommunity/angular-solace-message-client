import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DestinationType, MessageDeliveryModeType, MessageType, SDTField, SDTFieldType, SolclientFactory} from 'solclientjs';
import {Data, MessageEnvelope, PublishOptions, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {defer, Observable, Subject, Subscription, tap, throwError} from 'rxjs';
import {finalize, takeUntil} from 'rxjs/operators';
import {Arrays} from '@scion/toolkit/util';
import {observeInside} from '@scion/toolkit/operators';
import {MatCardModule} from '@angular/material/card';
import {SciViewportComponent} from '@scion/components/viewport';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MessageListItemComponent} from '../message-list-item/message-list-item.component';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';

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
  standalone: true,
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
export class PublisherComponent implements OnDestroy {

  private _destroy$ = new Subject<void>();
  private _publishSubscription: Subscription | null = null;

  public readonly DESTINATION = DESTINATION;
  public readonly DESTINATION_TYPE = DESTINATION_TYPE;
  public readonly DELIVERY_MODE = DELIVERY_MODE;
  public readonly MESSAGE = MESSAGE;
  public readonly MESSAGE_TYPE = MESSAGE_TYPE;
  public readonly HEADERS = HEADERS;
  public readonly REQUEST_REPLY = REQUEST_REPLY;

  public form: FormGroup;
  public publishError: string | null = null;
  public MessageType = MessageType;
  public DestinationType = DestinationType;
  public MessageDeliveryModeType = MessageDeliveryModeType;

  public replies: MessageEnvelope[] = [];

  constructor(formBuilder: FormBuilder,
              private _solaceMessageClient: SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [DESTINATION]: formBuilder.control('', Validators.required),
      [DESTINATION_TYPE]: formBuilder.control(DestinationType.TOPIC, Validators.required),
      [DELIVERY_MODE]: formBuilder.control(undefined),
      [MESSAGE]: formBuilder.control(''),
      [MESSAGE_TYPE]: formBuilder.control(MessageType.BINARY, Validators.required),
      [HEADERS]: formBuilder.control(''),
      [REQUEST_REPLY]: formBuilder.control(false),
    });
  }

  public async onPublish(): Promise<void> {
    this.form.disable();
    this.publishError = null;
    this._publishSubscription = this.publish$()
      .pipe(
        observeInside(continueFn => {
          continueFn();
          this._cd.markForCheck();
        }),
        finalize(() => {
          this.form.enable();
          this._publishSubscription = null;
        }),
        takeUntil(this._destroy$),
      )
      .subscribe({
        error: error => this.publishError = error,
      });
  }

  public onCancelPublish(): void {
    this._publishSubscription?.unsubscribe();
    this._publishSubscription = null;
    this.replies.length = 0;
  }

  public onClearReplies(): void {
    this.replies.length = 0;
  }

  private publish$(): Observable<any> {
    try {
      const destination = this.form.get(DESTINATION)!.value;
      const destinationType: DestinationType = this.form.get(DESTINATION_TYPE)!.value;
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

  public onDeleteReply(reply: MessageEnvelope): void {
    Arrays.remove(this.replies, reply);
  }

  public get requestReply(): boolean {
    return this.form.get(REQUEST_REPLY)!.value;
  }

  public get publishing(): boolean {
    return this._publishSubscription !== null;
  }

  private readPublishOptionsFromUI(): PublishOptions {
    return {
      headers: this.readHeadersFromUI(),
      deliveryMode: this.form.get(DELIVERY_MODE)!.value,
    };
  }

  private readMessageFromUI(): Data | undefined {
    const message = this.form.get(MESSAGE)!.value;
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

  private readHeadersFromUI(): Map<string, any> | undefined {
    const headers: string = this.form.get(HEADERS)!.value;
    if (!headers.length) {
      return undefined;
    }

    const headerMap = new Map();
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

  public ngOnDestroy(): void {
    this._destroy$.next();
  }
}
