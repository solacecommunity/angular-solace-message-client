<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | [Getting Started][menu-getting-started] | Features | [Changelog][menu-changelog] | [Try Me][menu-try-me] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Features

This page gives you an overview of features provided by Angular Solace Message Client library. If a feature you need is not listed here, please check the API
of [SolaceMessageClient](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html), or file a GitHub issue otherwise.

<details>
  <summary><strong>Publish message to a topic destination</strong></summary>
  <br>

When publishing a message to a topic, it will be transported to all consumers subscribed to the topic. A message may contain unstructured byte data, or a structured container.

#### Example:

```typescript
import { Message, MessageDeliveryModeType, MessageDumpFlag, SDTFieldType, SolaceMessageClient, SolaceObjectFactory } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public publishBinaryMessage(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C') // `solclientjs` encodes `string` to latin1 encoded binary attachment
    this.messageClient.publish('myhome/livingroom/temperature', new TextEncoder().encode('20°C')) // binary content in the form of a `Uint8Array`
  }

  public publishStructuredTextMessage(): void {
    const sdtField = SolaceObjectFactory.createSDTField(SDTFieldType.STRING, '20°C');
    this.messageClient.publish('myhome/livingroom/temperature', sdtField);
  }

  public publishMessageWithHeaders(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C', {
      headers: new Map().set('bearer', '<<ACCESS_TOKEN>>')
    });
  }

  public publishGuaranteedMessage(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C', {
      deliveryMode: MessageDeliveryModeType.PERSISTENT,
    });
  }

  public interceptMessageBeforePublish(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C', {
      intercept: (msg: Message) => {
        console.log('>>> msg to be published', msg.dump(MessageDumpFlag.MSGDUMP_FULL));
      },
    });
  }
}
```

> Refer to [SolaceMessageClient#publish](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#publish) for more information.

</details>

<details>
  <summary><strong>Receive messages published to a topic</strong></summary>
  <br>

You can subscribe to multiple topics simultaneously by using wildcard segments in the topic.

#### Example:

```typescript
import { SolaceMessageClient } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient, private zone: NgZone) {
  }

  public receiveMessagesOnExactTopic(): void {
    this.messageClient.observe$('myhome/livingroom/temperature').subscribe(envelope => {
      console.log('Received temperature for livingroom', envelope.message);
    });
  }

  public receiveMessagesForAnyRoom(): void {
    this.messageClient.observe$('myhome/*/temperature').subscribe(envelope => {
      console.log('Received temperature', envelope.message);
    });
  }

  public receiveMessagesForAnyRoomUsingNamedWildcardSegment(): void {
    this.messageClient.observe$('myhome/:room/temperature').subscribe(envelope => {
      console.log(`Received temperature for room ${envelope.params.get('room')}`, envelope.message);
    });
  }

  public receiveMessagesOutsideAngular(): void {
    this.messageClient.observe$('myhome/livingroom/temperature', {emitOutsideAngularZone: true}).subscribe(() => {
      console.log('Running outside Angular zone');
      this.zone.run(() => console.log('Running inside Angular zone'));
    });
  }

  public readMessageHeaders(): void {
    this.messageClient.observe$('myhome/*/temperature').subscribe(envelope => {
      const accessToken = envelope.headers.get('bearer');
    });
  }
}

```

> Refer to [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#observe_) for more information.

</details>

<details>
  <summary><strong>Consume messages published to a topic via a non-durable topic endpoint</strong></summary>
  <br>

Instead of observing messages published to a topic
via [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#observe_), you can consume messages via a temporary,
non-durable topic endpoint, so that messages are not lost even in the event of short connection interruptions as messages are retained on the broker until consumed by the consumer. The
lifecycle of a non-durable topic endpoint is bound to the client that created it, with an additional 60s in case of unexpected disconnect.

```typescript
import { SolaceMessageClient } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public consumeMessagesSentToTopic(): void {
    this.messageClient.consume$('topic').subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });

    // Above code uses a convenience API by passing the topic as `string` literal, which is equivalent to the following code.
    this.messageClient.consume$({
      topicEndpointSubscription: SolaceObjectFactory.createTopicDestination('topic'),
      queueDescriptor: {
        type: QueueType.TOPIC_ENDPOINT,
        durable: false,
      },
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}
```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#consume_) for more information.

It is important to understand that a topic is not the same thing as a topic endpoint. A topic is a message property the event broker uses to route a message to its destination. Topic
endpoints, unlike topics, are objects that define the storage of messages for a consuming application. Topic endpoints are more closely related to queues than to topics. Messages cannot be
published directly to topic endpoints, but only indirectly via topics. For more information, refer to https://solace.com/blog/queues-vs-topic-endpoints.

</details>

<details>
  <summary><strong>Send message to a queue endpoint</strong></summary>
  <br>

A queue is typically used in a point-to-point (P2P) messaging environment. A queue differs from the topic distribution mechanism that the message is transported to exactly a single consumer,
i.e., the message is load balanced to a single consumer in round‑robin fashion, or for exclusive queues, it is always transported to the same subscription. When sending a message to a
queue, the broker retains the message until it is consumed, or until it expires.

> Refer to [SolaceMessageClient#enqueue](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#enqueue) for more information.

#### Example:

```typescript
import { Message, MessageDeliveryModeType, MessageDumpFlag, SDTFieldType, SolaceMessageClient, SolaceObjectFactory } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public sendBinaryMessage(): void {
    this.messageClient.enqueue('queue', '20°C'); // `solclientjs` encodes `string` to latin1 encoded binary attachment
    this.messageClient.enqueue('queue', new TextEncoder().encode('20°C')); // binary content in the form of a `Uint8Array`
  }

  public sendStructuredTextMessage(): void {
    const sdtField = SolaceObjectFactory.createSDTField(SDTFieldType.STRING, '20°C');

    this.messageClient.enqueue('queue', sdtField);
  }

  public sendMessageWithHeaders(): void {
    this.messageClient.enqueue('queue', '20°C', {headers: new Map().set('bearer', '<<ACCESS_TOKEN>>')});
  }

  public sendGuaranteedMessage(): void {
    this.messageClient.enqueue('queue', '20°C', {
      deliveryMode: MessageDeliveryModeType.PERSISTENT,
    });
  }

  public interceptMessageBeforeSend(): void {
    this.messageClient.enqueue('queue', '20°C', {
      intercept: (msg: Message) => {
        console.log('>>> msg to be sent', msg.dump(MessageDumpFlag.MSGDUMP_FULL));
      },
    });
  }
}
```

</details>

<details>
  <summary><strong>Consume messages sent to a durable queue</strong></summary>
  <br>

```typescript
import { QueueType, SolaceMessageClient, SolaceObjectFactory } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public consumeMessagesSentToQueue(): void {
    this.messageClient.consume$({
      queueDescriptor: {
        type: QueueType.QUEUE,
        name: 'queue',
      },
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}

```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#consume_) for more information.

</details>

<details>
  <summary><strong>Browse messages sent to a durable queue</strong></summary>
  <br>
Browses messages in a queue, without removing/consuming the messages.

```typescript
import { QueueType, SolaceMessageClient } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public browseMessages(): void {
    this.messageClient.browse$('queue').subscribe(envelope => {
      console.log('message', envelope.message);
    });

    // Above code uses a convenience API by passing the queue as `string` literal, which is equivalent to the following code.
    this.messageClient.browse$({
      queueDescriptor: {
        type: QueueType.QUEUE,
        name: 'queue',
      },
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}

```

> Refer to [SolaceMessageClient#browse$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#browse_) for more information.

</details>

<details>
  <summary><strong>Monitor connectivity to the message broker</strong></summary>
  <br>

```typescript
import { SolaceMessageClient } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(messageClient: SolaceMessageClient) {
    messageClient.connected$.subscribe(connected => {
      console.log('connected to the broker', connected);
    });
  }
}

```

> Refer to [SolaceMessageClient#connected$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/solacemessageclient.html#connected_) for more information.

</details>

<details>
  <summary><strong>Obtain Solace session for full functionality of *solclient* library</strong></summary>
  <br>

You can obtain the native Solace session to get the full functionality of the underlying *solclient* library.

```typescript
import { Session, SolaceMessageClient } from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(messageClient: SolaceMessageClient) {
    messageClient.session.then((session: Session) => {

    });
  }
}

```

> Refer to [SolaceMessageClient#session](https://solacecommunity.github.io/angular-solace-message-client/api/interfaces/session.html) for more information.

</details>

[menu-overview]: /README.md

[menu-getting-started]: /docs/site/getting-started.md

[menu-features]: /docs/site/features.md

[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme

[menu-contributing]: /CONTRIBUTING.md

[menu-changelog]: /docs/site/changelog/changelog.md

