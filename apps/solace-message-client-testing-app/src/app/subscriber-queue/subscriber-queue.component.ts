import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as solace from 'solace-message-client';
import { SolaceMessageClient } from 'solace-message-client';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SciViewportComponent } from '@scion/toolkit/viewport';

export const QUEUE = 'queue';

@Component({
  selector: 'app-subscriber-queue',
  templateUrl: './subscriber-queue.component.html',
  styleUrls: ['./subscriber-queue.component.scss'],
})
export class SubscriberQueueComponent {

  public readonly QUEUE = QUEUE;

  public form: FormGroup;
  public subscribeError: string;
  public messages: Message[] = [];

  private _queueSubscription: Subscription;

  @ViewChild(SciViewportComponent)
  private _viewport: SciViewportComponent;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [QUEUE]: formBuilder.control('', Validators.required),
    });
  }

  public onSubscribe(): void {
    this.form.disable();
    this.subscribeError = null;

    try {
      this._queueSubscription = this.solaceMessageClient.observeQueue$(this.form.get(QUEUE).value)
        .pipe(finalize(() => this.form.enable()))
        .subscribe(
          (message: solace.Message) => {
            this.messages = [...this.messages, {
              type: formatMessageType(message.getType()),
              details: message.dump(solace.MessageDumpFlag.MSGDUMP_BRIEF),
              binary: message.getType() === solace.MessageType.BINARY && message.getBinaryAttachment(),
              text: message.getType() === solace.MessageType.TEXT && message.getSdtContainer().getValue(),
              timestamp: message.getSenderTimestamp(),
              namedWildcardSegments: '',
            }];

            // follow tail
            this._cd.detectChanges();
            this._viewport.scrollTop = this._viewport.scrollHeight;
          },
          error => {
            console.log('>>> onError', error);
            this.subscribeError = error.toString();
          },
          () => console.log('>>> complete'),
        );
    }
    catch (error) {
      this.form.enable();
      this.subscribeError = error;
    }
  }

  public onUnsubscribe(): void {
    this._queueSubscription && this._queueSubscription.unsubscribe();
    this._queueSubscription = null;
  }

  public onClear(): void {
    this.messages = [];
  }

  public onMessageDelete(message: Message): void {
    this.messages = this.messages.filter(it => it !== message);
  }

  public get isSubscribed(): boolean {
    return this._queueSubscription && !this._queueSubscription.closed;
  }
}

export interface Message {
  type: string;
  text: string;
  binary: Uint8Array;
  details: string;
  timestamp: number;
  namedWildcardSegments: string;
}

function formatMessageType(messageType: solace.MessageType): string {
  switch (messageType) {
    case solace.MessageType.TEXT:
      return `TEXT (${messageType})`;
    case solace.MessageType.BINARY:
      return `BINARY (${messageType})`;
    case solace.MessageType.MAP:
      return `MAP (${messageType})`;
    case solace.MessageType.STREAM:
      return `STREAM (${messageType})`;
    default:
      return `UNKNOWN (${messageType})`;
  }
}
