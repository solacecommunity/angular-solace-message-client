import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageType, SDTFieldType, SolaceMessageClient, SolaceObjectFactory } from 'solace-message-client';

export const TOPIC = 'topic';
export const MESSAGE = 'message';
export const MESSAGE_TYPE = 'messageType';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent {

  public readonly TOPIC = TOPIC;
  public readonly MESSAGE = MESSAGE;
  public readonly MESSAGE_TYPE = MESSAGE_TYPE;

  public form: FormGroup;
  public publishError: string;
  public MessageType = MessageType;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient) {
    this.form = new FormGroup({
      [TOPIC]: formBuilder.control('', Validators.required),
      [MESSAGE]: formBuilder.control(''),
      [MESSAGE_TYPE]: formBuilder.control(MessageType.BINARY, Validators.required),
    });
  }

  public async onPublish(): Promise<void> {
    const message = this.form.get(MESSAGE).value;
    const topic = this.form.get(TOPIC).value;

    this.publishError = null;
    try {
      if (this.form.get(MESSAGE_TYPE).value === MessageType.TEXT) {
        const structuredTextMessage = message ? SolaceObjectFactory.createSDTField(SDTFieldType.STRING, message) : undefined;
        await this.solaceMessageClient.publish(topic, structuredTextMessage);
      }
      else {
        const binaryMessage = message ? new TextEncoder().encode(message) : undefined;
        await this.solaceMessageClient.publish(topic, binaryMessage);
      }
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }
}
