import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageType, SDTFieldType, SolaceMessageClient, SolaceObjectFactory } from 'solace-message-client';

export const TOPIC = 'topic';
export const MESSAGE = 'message';
export const MESSAGE_TYPE = 'messageType';
export const HEADERS = 'headers';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent {

  public readonly TOPIC = TOPIC;
  public readonly MESSAGE = MESSAGE;
  public readonly MESSAGE_TYPE = MESSAGE_TYPE;
  public readonly HEADERS = HEADERS;

  public form: FormGroup;
  public publishError: string;
  public MessageType = MessageType;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient) {
    this.form = new FormGroup({
      [TOPIC]: formBuilder.control('', Validators.required),
      [MESSAGE]: formBuilder.control(''),
      [MESSAGE_TYPE]: formBuilder.control(MessageType.BINARY, Validators.required),
      [HEADERS]: formBuilder.control(''),
    });
  }

  public async onPublish(): Promise<void> {
    const message = this.form.get(MESSAGE).value;
    const topic = this.form.get(TOPIC).value;
    const headers = this.parseHeaders();

    this.publishError = null;
    try {
      if (this.form.get(MESSAGE_TYPE).value === MessageType.TEXT) {
        const structuredTextMessage = message ? SolaceObjectFactory.createSDTField(SDTFieldType.STRING, message) : undefined;
        await this.solaceMessageClient.publish(topic, structuredTextMessage, {headers});
      }
      else {
        const binaryMessage = message ? new TextEncoder().encode(message) : undefined;
        await this.solaceMessageClient.publish(topic, binaryMessage, {headers});
      }
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }

  private parseHeaders(): Map<string, any> | undefined {
    const headers: string = this.form.get(HEADERS).value;
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
}
