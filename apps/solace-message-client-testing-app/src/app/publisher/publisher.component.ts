import {ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject} from '@angular/core';
import {NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
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
  private readonly _formBuilder = inject(NonNullableFormBuilder);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly MessageType = MessageType;
  protected readonly DestinationType = DestinationType;
  protected readonly MessageDeliveryModeType = MessageDeliveryModeType;

  protected readonly form = this._formBuilder.group({
    destination: this._formBuilder.control('', Validators.required),
    destinationType: this._formBuilder.control(DestinationType.TOPIC, Validators.required),
    deliveryMode: this._formBuilder.control(MessageDeliveryModeType.DIRECT),
    message: this._formBuilder.control(''),
    messageType: this._formBuilder.control(MessageType.BINARY, Validators.required),
    headers: this._formBuilder.control(''),
    requestReply: this._formBuilder.control(false),
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
        error: (error: unknown) => this.publishError = `${error}`,
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
      const destination = this.form.controls.destination.value;
      const destinationType = this.form.controls.destinationType.value;
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
    return this.form.controls.requestReply.value;
  }

  protected get publishing(): boolean {
    return this._publishSubscription !== null;
  }

  private readPublishOptionsFromUI(): PublishOptions {
    return {
      headers: this.readHeadersFromUI(),
      deliveryMode: this.form.controls.deliveryMode.value,
    };
  }

  private readMessageFromUI(): Data | undefined {
    const message = this.form.controls.message.value;
    if (!message) {
      return undefined;
    }

    if (this.form.controls.messageType.value === MessageType.TEXT) {
      return SDTField.create(SDTFieldType.STRING, message); // structuredTextMessage
    }
    else {
      return new TextEncoder().encode(message); // binary message
    }
  }

  private readHeadersFromUI(): Map<string, string | boolean | number> | undefined {
    const headers = this.form.controls.headers.value;
    if (!headers.length) {
      return undefined;
    }

    const headerMap = new Map<string, string | boolean | number>();
    headers.split(';').forEach(keyValue => {
      const [key, value] = keyValue.split('->');
      if (value === 'true' || value === 'false') {
        headerMap.set(key!, Boolean(value));
      }
      else if (!Number.isNaN(Number(value))) {
        headerMap.set(key!, Number(value));
      }
      else {
        headerMap.set(key!, value!);
      }
    });
    return headerMap;
  }
}
