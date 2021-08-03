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
      [MESSAGE]: formBuilder.control('', Validators.required),
      [MESSAGE_TYPE]: formBuilder.control(MessageType.BINARY, Validators.required),
    });
  }

  public async onPublish(): Promise<void> {
    this.publishError = null;
    try {
      if (this.form.get(MESSAGE_TYPE).value === MessageType.TEXT) {
        const structuredTextMessage = SolaceObjectFactory.createSDTField(SDTFieldType.STRING, this.form.get(MESSAGE).value);
        await this.solaceMessageClient.publish(this.form.get(TOPIC).value, structuredTextMessage);
      }
      else {
        await this.solaceMessageClient.publish(this.form.get(TOPIC).value, new TextEncoder().encode(this.form.get(MESSAGE).value));
      }
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }
}
