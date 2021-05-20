import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as solace from 'solace-message-client';
import { SciViewportComponent } from '@scion/toolkit/viewport';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

export const QUEUE = 'queue';

@Component({
  selector: 'app-browse-queue',
  templateUrl: './browse-queue.component.html',
  styleUrls: ['./browse-queue.component.scss'],
})
export class BrowseQueueComponent {

  public readonly QUEUE = QUEUE;

  public form: FormGroup;
  public subscribeError: string;
  public messages: Message[] = [];

  private _queueSubscription: Subscription;

  @ViewChild(SciViewportComponent)
  private _viewport: SciViewportComponent;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: solace.SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [QUEUE]: formBuilder.control('', Validators.required),
    });
  }

  public onBrowseQueue(): void {
    this.form.disable();
    this.subscribeError = null;

    try {
      this._queueSubscription = this.solaceMessageClient.browseQueue$({
        name: this.form.get(QUEUE).value,
        type: solace.QueueType.QUEUE,
        durable: true
      })
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
          error => this.subscribeError = error.toString(),
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
    this.messages = [];
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
