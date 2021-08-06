import * as solace from 'solclientjs/lib-browser/solclient-full';

import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Data, DestinationType, MessageDeliveryModeType, MessageType, PublishOptions, SDTFieldType, SolaceMessageClient, SolaceObjectFactory } from 'solace-message-client';

export const DESTINATION = 'destination';
export const DESTINATION_TYPE = 'destinationType';
export const MESSAGE = 'message';
export const MESSAGE_TYPE = 'messageType';
export const HEADERS = 'headers';

@Component({
  selector: 'app-publisher',
  templateUrl: './publisher.component.html',
  styleUrls: ['./publisher.component.scss'],
})
export class PublisherComponent {

  public readonly DESTINATION = DESTINATION;
  public readonly DESTINATION_TYPE = DESTINATION_TYPE;
  public readonly MESSAGE = MESSAGE;
  public readonly MESSAGE_TYPE = MESSAGE_TYPE;
  public readonly HEADERS = HEADERS;

  public form: FormGroup;
  public publishError: string;
  public MessageType = MessageType;
  public DestinationType = DestinationType;

  constructor(formBuilder: FormBuilder,
              public solaceMessageClient: SolaceMessageClient) {
    this.form = new FormGroup({
      [DESTINATION]: formBuilder.control('', Validators.required),
      [DESTINATION_TYPE]: formBuilder.control(solace.DestinationType.TOPIC, Validators.required),
      [MESSAGE]: formBuilder.control(''),
      [MESSAGE_TYPE]: formBuilder.control(MessageType.BINARY, Validators.required),
      [HEADERS]: formBuilder.control(''),
    });
  }

  public async onPublish(): Promise<void> {
    const destination = this.form.get(DESTINATION).value;

    this.publishError = null;
    try {
      switch (this.form.get(DESTINATION_TYPE).value) {
        case DestinationType.TOPIC: {
          await this.solaceMessageClient.publish(destination, this.readMessageFromUI(), this.readPublishOptionsFromUI());
          return;
        }
        case DestinationType.QUEUE: {
          await this.solaceMessageClient.enqueue(destination, this.readMessageFromUI(), this.readPublishOptionsFromUI());
          return;
        }
      }
    }
    catch (error) {
      this.publishError = error.toString();
    }
  }

  private readPublishOptionsFromUI(): PublishOptions {
    return {
      headers: this.readHeadersFromUI(),
      deliveryMode: MessageDeliveryModeType.DIRECT,
    };
  }

  private readMessageFromUI(): Data | undefined {
    const message = this.form.get(MESSAGE).value;
    if (!message) {
      return undefined;
    }

    if (this.form.get(MESSAGE_TYPE).value === MessageType.TEXT) {
      return SolaceObjectFactory.createSDTField(SDTFieldType.STRING, message); // structuredTextMessage
    }
    else {
      return new TextEncoder().encode(message); // binary message
    }
  }

  private readHeadersFromUI(): Map<string, any> | undefined {
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
