import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {Message, MessageDumpFlag, MessageEnvelope, MessageType} from '@solace-community/angular-solace-message-client';
import {ungzip} from 'pako';

@Component({
  selector: 'app-message-list-item',
  templateUrl: './message-list-item.component.html',
  styleUrls: ['./message-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListItemComponent implements OnChanges {

  public message!: Message;
  public details!: string;
  public type!: string;
  public content: string | undefined;

  @Input()
  public envelope!: MessageEnvelope;

  @Output()
  public delete = new EventEmitter<void>();

  public onDelete(): void {
    this.delete.emit();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this.message = this.envelope.message;
    this.details = this.message.dump(MessageDumpFlag.MSGDUMP_BRIEF);
    this.type = formatMessageType(this.message.getType());
    this.content = getContent(this.envelope);
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
    default:
      return `UNKNOWN (${messageType})`;
  }
}

function getContent(envelope: MessageEnvelope): string | undefined {
  const encoding = envelope.headers.get('Content-Encoding');

  switch (envelope.message.getType()) {
    case MessageType.BINARY:
      return decode(envelope.message.getBinaryAttachment(), encoding);
    case MessageType.TEXT:
      return decode(envelope.message.getSdtContainer()!.getValue(), encoding);
    default:
      return undefined;
  }
}

function decode(content: string | Uint8Array, encoding: string): string | undefined {
  if (content === undefined || content === null) {
    return undefined;
  }

  if (encoding === 'gzip') {
    const binary = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    return ungzip(binary, {to: 'string'});
  }

  return (typeof content === 'string') ? content : new TextDecoder().decode(content);
}
