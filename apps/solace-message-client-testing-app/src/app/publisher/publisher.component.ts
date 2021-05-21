import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as solace from 'solace-message-client';
import { MessageBodyFormat, SolaceMessageClient } from 'solace-message-client';

export const DESTINATION = 'destination';
export const DESTINATION_TYPE = 'destination_type';
export const MESSAGE = 'message';
export const FORMAT = 'format';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent {

  public readonly DESTINATION = DESTINATION;
  public readonly DESTINATION_TYPE = DESTINATION_TYPE;
  public readonly MESSAGE = MESSAGE;
  public readonly FORMAT = FORMAT;

  public form: FormGroup;
  public publishError: string;
  public MessageBodyFormat = MessageBodyFormat;
  public DestinationType = solace.DestinationType;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient) {
    this.form = new FormGroup({
      [DESTINATION]: formBuilder.control('', Validators.required),
      [DESTINATION_TYPE]: formBuilder.control(solace.DestinationType.TOPIC, Validators.required),
      [MESSAGE]: formBuilder.control('', Validators.required),
      [FORMAT]: formBuilder.control(MessageBodyFormat.TEXT, Validators.required),
    });
  }

  public async onPublish(): Promise<void> {
    this.publishError = null;
    try {
      await this.solaceMessageClient.sendTo(
        this.form.get(DESTINATION).value,
        this.form.get(DESTINATION_TYPE).value,
        this.form.get(MESSAGE).value,
        {
          format: this.form.get(FORMAT).value,
        });
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }
}
