import {ChangeDetectionStrategy, Component, computed, input, output, Signal, untracked} from '@angular/core';
import {MessageEnvelope} from '@solace-community/angular-solace-message-client';
import {ungzip} from 'pako';
import {MessageDumpFlag, MessageType} from 'solclientjs';
import {DatePipe} from '@angular/common';
import {StringifyMapPipe} from '../stringify-map.pipe';
import {SciViewportComponent} from '@scion/components/viewport';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-message-list-item',
  templateUrl: './message-list-item.component.html',
  styleUrls: ['./message-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    StringifyMapPipe,
    SciViewportComponent,
    MatIconModule,
    MatButtonModule,
  ],
})
export class MessageListItemComponent {

  public readonly envelope = input.required<MessageEnvelope>();
  public readonly delete = output<void>();
  public readonly reply = output<void>();

  protected readonly message = computed(() => this.envelope().message);
  protected readonly details = computed(() => this.message().dump(MessageDumpFlag.MSGDUMP_BRIEF));
  protected readonly content = this.computeContent();
  protected readonly type = this.computeType();

  protected onDelete(): void {
    this.delete.emit();
  }

  protected onReply(): void {
    this.reply.emit();
  }

  private computeContent(): Signal<string | undefined> {
    return computed(() => {
      const envelope = this.envelope();
      return untracked(() => getContent(envelope));
    });
  }

  private computeType(): Signal<string> {
    return computed(() => {
      const message = this.message();
      return untracked(() => formatMessageType(message.getType()));
    });
  }
}

function formatMessageType(messageType: MessageType): string {
  switch (messageType) {
    case MessageType.TEXT:
      return `TEXT (${messageType})`;
    case MessageType.BINARY:
      return `BINARY (${messageType})`;
    case MessageType.MAP:
      return `MAP (${messageType})`;
    case MessageType.STREAM:
      return `STREAM (${messageType})`;
  }
}

function getContent(envelope: MessageEnvelope): string | undefined {
  const encoding = envelope.headers.get('Content-Encoding') as string;

  switch (envelope.message.getType()) {
    case MessageType.BINARY:
      return decode(envelope.message.getBinaryAttachment(), encoding);
    case MessageType.TEXT:
      return decode(envelope.message.getSdtContainer()!.getValue() as string, encoding);
    default:
      return undefined;
  }
}

function decode(content: Uint8Array | string | null | undefined, encoding: string): string | undefined {
  if (content === undefined || content === null) {
    return undefined;
  }

  if (encoding === 'gzip') {
    const binary = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    return ungzip(binary, {to: 'string'});
  }

  return (typeof content === 'string') ? content : new TextDecoder().decode(content);
}
