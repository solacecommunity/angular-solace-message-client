import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageEnvelope, SolaceMessageClient } from 'solace-message-client';
import { Subscription } from 'rxjs';
import * as solace from 'solclientjs/lib-browser/solclient-full';
import { finalize } from 'rxjs/operators';
import { SciViewportComponent } from '@scion/toolkit/viewport';

export const TOPIC = 'topic';

@Component({
  selector: 'app-subscriber',
  templateUrl: './subscriber.component.html',
  styleUrls: ['./subscriber.component.scss'],
})
export class SubscriberComponent {

  public readonly TOPIC = TOPIC;

  public form: FormGroup;
  public subscribeError: string;
  public messages: Message[] = [];

  private _subscription: Subscription;

  @ViewChild(SciViewportComponent)
  private _viewport: SciViewportComponent;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient,
              private _cd: ChangeDetectorRef) {
    this.form = new FormGroup({
      [TOPIC]: formBuilder.control('', Validators.required),
    });
  }

  public onSubscribe(): void {
    this.form.disable();
    this.subscribeError = null;

    try {
      this._subscription = this.solaceMessageClient.observe$(this.form.get(TOPIC).value)
        .pipe(finalize(() => this.form.enable()))
        .subscribe(
          (envelope: MessageEnvelope) => {
            const message: solace.Message = envelope.message;
            this.messages = [...this.messages, {
              type: formatMessageType(message.getType()),
              details: message.dump(solace.MessageDumpFlag.MSGDUMP_BRIEF),
              binary: message.getType() === solace.MessageType.BINARY && message.getBinaryAttachment(),
              text: message.getType() === solace.MessageType.TEXT && message.getSdtContainer().getValue(),
              timestamp: Date.now(),
              namedWildcardSegments: Array.from(envelope.params.entries()).reduce((params, [key, value]) => params.concat(`${key}->${value}`), []).join(', '),
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
    this._subscription && this._subscription.unsubscribe();
    this._subscription = null;
  }

  public onClear(): void {
    this.messages = [];
  }

  public onMessageDelete(message: solace.Message): void {
    this.messages = this.messages.filter(it => it !== message);
  }

  public get isSubscribed(): boolean {
    return this._subscription && !this._subscription.closed;
  }
}

export interface Message {
  type: solace.MessageType;
  text: string;
  binary: string;
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
