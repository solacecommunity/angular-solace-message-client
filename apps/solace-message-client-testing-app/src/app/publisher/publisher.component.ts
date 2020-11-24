import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageBodyFormat, SolaceMessageClient } from 'solace-message-client';

export const TOPIC = 'topic';
export const MESSAGE = 'message';
export const FORMAT = 'format';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent {

  public readonly TOPIC = TOPIC;
  public readonly MESSAGE = MESSAGE;
  public readonly FORMAT = FORMAT;

  public form: FormGroup;
  public publishError: string;
  public MessageBodyFormat = MessageBodyFormat;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient) {
    this.form = new FormGroup({
      [TOPIC]: formBuilder.control('', Validators.required),
      [MESSAGE]: formBuilder.control('', Validators.required),
      [FORMAT]: formBuilder.control(MessageBodyFormat.TEXT, Validators.required),
    });
  }

  public async onPublish(): Promise<void> {
    this.publishError = null;
    try {
      await this.solaceMessageClient.publish(this.form.get(TOPIC).value, this.form.get(MESSAGE).value, {
        format: this.form.get(FORMAT).value,
      });
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }
}
