<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | [Getting Started][menu-getting-started] | Features | [Changelog][menu-changelog] | [Try Me][menu-try-me] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Features

This page gives you an overview of features provided by Angular Solace Message Client library. If a feature you need is not listed here, please check the API of [SolaceMessageClient](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html), or file a GitHub issue otherwise.

<details>
  <summary><strong>Send message to a topic destination</strong></summary>
  <br>

When publishing a message to a topic, it will be transported to all consumers subscribed to the topic. A message may contain unstructured byte data, or a structured container.

#### Example:

```typescript
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Injectable} from '@angular/core';
import {Message, MessageDeliveryModeType, MessageDumpFlag, SDTField, SDTFieldType} from 'solclientjs';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public publishBinaryMessage(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C');

    // `solclientjs` encodes `string` content to latin1 encoded binary attachment. Alternatively, you can directly pass binary content, as follows:
    this.messageClient.publish('myhome/livingroom/temperature', new TextEncoder().encode('20°C'));
  }

  public publishStructuredTextMessage(): void {
    const sdtField = SDTField.create(SDTFieldType.STRING, '20°C');
    this.messageClient.publish('myhome/livingroom/temperature', sdtField);
  }

  public publishMessageWithHeaders(): void {
    this.messageClient.publish('myhome/livingroom/temperature', '20°C', {
      headers: new Map().set('bearer', '<<ACCESS_TOKEN>>'),
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

> Refer to [SolaceMessageClient#publish](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#publish) for more information about the API.

</details>

<details>
  <summary><strong>Receive messages published to a topic</strong></summary>
  <br>

You can subscribe to multiple topics simultaneously by using wildcard segments in the topic.

#### Example:

```typescript
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Injectable, NgZone} from '@angular/core';

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
      const accessToken = envelope.headers.get('ACCESS_TOKEN');
    });
  }
}

```

> Refer to [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#observe_) for more information about the API.

</details>

<details>
  <summary><strong>Consume messages published to a topic via a non-durable topic endpoint</strong></summary>
  <br>

Instead of observing messages published to a topic via [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#observe_), you can consume messages via a temporary, non-durable topic endpoint, so that messages are not lost even in the event of short connection interruptions as messages are retained on the broker until consumed by the consumer. The lifecycle of a non-durable topic endpoint is bound to the client that created it, with an additional 60s in case of unexpected disconnect.

```typescript
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {QueueType, SolclientFactory} from 'solclientjs';
import {Injectable} from '@angular/core';

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
      topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
      queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}
```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#consume_) for more information about the API.

It is important to understand that a topic is not the same thing as a topic endpoint. A topic is a message property the event broker uses to route a message to its destination. Topic endpoints, unlike topics, are objects that define the storage of messages for a consuming application. Topic endpoints are more closely related to queues than to topics. Messages cannot be published directly to topic endpoints, but only indirectly via topics. For more information, refer to https://solace.com/blog/queues-vs-topic-endpoints.

</details>

<details>
  <summary><strong>Send message to a queue endpoint</strong></summary>
  <br>

A queue is typically used in a point-to-point (P2P) messaging environment. A queue differs from the topic distribution mechanism that the message is transported to exactly a single consumer, i.e., the message is load balanced to a single consumer in round‑robin fashion, or for exclusive queues, it is always transported to the same subscription. When sending a message to a queue, the broker retains the message until it is consumed, or until it expires.

> Refer to [SolaceMessageClient#publish](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#publish) for more information about the API.

#### Example:

```typescript
import {Injectable} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Message, MessageDeliveryModeType, MessageDumpFlag, SDTField, SDTFieldType} from 'solclientjs';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public sendBinaryMessage(): void {
    const queue = SolclientFactory.createDurableQueueDestination('queue');
    this.messageClient.publish(queue, '20°C');

    // `solclientjs` encodes `string` content to latin1 encoded binary attachment. Alternatively, you can directly pass binary content, as follows:
    this.messageClient.publish(queue, new TextEncoder().encode('20°C'));
  }

  public sendStructuredTextMessage(): void {
    const queue = SolclientFactory.createDurableQueueDestination('queue');
    const sdtField = SDTField.create(SDTFieldType.STRING, '20°C');

    this.messageClient.publish(queue, sdtField);
  }

  public sendMessageWithHeaders(): void {
    const queue = SolclientFactory.createDurableQueueDestination('queue');
    this.messageClient.publish(queue, '20°C', {headers: new Map().set('bearer', '<<ACCESS_TOKEN>>')});
  }

  public sendGuaranteedMessage(): void {
    const queue = SolclientFactory.createDurableQueueDestination('queue');
    this.messageClient.publish(queue, '20°C', {
      deliveryMode: MessageDeliveryModeType.PERSISTENT,
    });
  }

  public interceptMessageBeforeSend(): void {
    const queue = SolclientFactory.createDurableQueueDestination('queue');
    this.messageClient.publish(queue, '20°C', {
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
import {Injectable} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {QueueDescriptor, QueueType} from 'solclientjs';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
  }

  public consumeMessagesSentToQueue(): void {
    this.messageClient.consume$({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}

```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#consume_) for more information about the API.

</details>

<details>
  <summary><strong>Browse messages sent to a durable queue</strong></summary>
  <br>
Browses messages in a queue, without removing/consuming the messages.

```typescript
import {Injectable} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {QueueDescriptor, QueueType} from 'solclientjs';

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
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
    }).subscribe(envelope => {
      console.log('message consumed', envelope.message);
    });
  }
}

```

> Refer to [SolaceMessageClient#browse$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#browse_) for more information about the API.

</details>

<details>
  <summary><strong>Request-Response Communication</strong></summary>
  <br>
The following snippet illustrates how to send a request and receive the response.

```typescript
import {Injectable} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

@Injectable()
export class YourService {

  constructor(private messageClient: SolaceMessageClient) {
    this.installReplier();
  }

  /**
   * Initiates a request-response communication.
   */
  public request(): void {
    this.messageClient.request$('request-topic', 'request data').subscribe(reply => {
      console.log('reply received', reply);
    });
  }

  private installReplier(): void {
    // Listen for requests sent to the request topic.
    this.messageClient.observe$('request-topic').subscribe(request => {
      // Reply to the request.
      this.messageClient.reply(request.message, 'reply');

      // Above code uses a convenience API to directly respond to a request.
      // Alternatively, you could answer to the request as following.
      this.messageClient.publish(request.message.getReplyTo(), 'reply', {
        markAsReply: true,
        correlationId: request.message.getCorrelationId(),
      });
    });
  }
}

```

> Refer to [SolaceMessageClient#request$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#request_) for more information about the API.

</details>

<details>
  <summary><strong>Monitor connectivity to the message broker</strong></summary>
  <br>

```typescript
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Injectable} from '@angular/core';

@Injectable()
export class YourService {

  constructor(messageClient: SolaceMessageClient) {
    messageClient.connected$.subscribe(connected => {
      console.log('connected to the broker', connected);
    });
  }
}

```

> Refer to [SolaceMessageClient#connected$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#connected_) for more information about the API.

</details>

<details>
  <summary><strong>Obtain Solace session for full functionality of *solclient* library</strong></summary>
  <br>

You can obtain the native Solace session to get the full functionality of the underlying *solclient* library.

```typescript
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Injectable} from '@angular/core';
import {Session} from 'solclientjs';

@Injectable()
export class YourService {

  constructor(messageClient: SolaceMessageClient) {
    messageClient.session.then((session: Session) => {

    });
  }
}

```

> Refer to [SolaceMessageClient#session](https://solacecommunity.github.io/angular-solace-message-client/api/interfaces/Session.html) for more information about the API.

</details>

<details>
  <summary><strong>Enable OAUTH2 authentication</strong></summary>
  <br>

OAuth 2.0 enables secure login to the broker while protecting user credentials. Follow these steps to enable OAuth authentication:
- Create an access token provider:
  - Create a class that implements `OAuthAccessTokenProvider`.
  - Register the class as Angular provider, either via `providers` array of the `@NgModule` or via the `providedIn` property of the `@Injectable` decorator.
  - Implement the method `provide$` in your `OAuthAccessTokenProvider`.
    The method should return an Observable that, when being subscribed, emits the user's access token, and then emits continuously when the token is renewed. It should never complete. Otherwise, the connection to the broker would not be re-established in the event of a network interruption. 
- Enable OAUTH and configure the access token in the config passed to `SolaceMessageClientModule.forRoot` or `SolaceMessageClient.connect`, as follows:
  - Set `SolaceMessageClientConfig.authenticationScheme` to `AuthenticationScheme.OAUTH2`.
  - Set `SolaceMessageClientConfig.accessToken` to the above provider class.

#### Example of an `OAuthAccessTokenProvider`

```ts
import {Injectable} from '@angular/core';
import {OAuthAccessTokenProvider} from '@solace-community/angular-solace-message-client';

@Injectable({providedIn: 'root'})
export class YourAccessTokenProvider implements OAuthAccessTokenProvider {

  constructor(private authService: YourAuthService) {
  }

  public provide$(): Observable<string> {
    return this.authService.accessToken$;
  }
}
```

#### Example for the configuration of the Solace Message Client

```ts
import {NgModule} from '@angular/core';
import {SolaceMessageClientModule} from '@solace-community/angular-solace-message-client';

@NgModule({
  imports: [
    ...
      SolaceMessageClientModule.forRoot({
        url: 'wss://YOUR-SOLACE-BROKER-URL:443',
        vpnName: 'YOUR VPN',
        authenticationScheme: AuthenticationScheme.OAUTH2, // enables OAUTH
        accessToken: YourAccessTokenProvider, // sets the access token provider
      }),
  ],
  ...
})
export class AppModule {
}
```

> Refer to [SolaceMessageClientConfig#accessToken](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClientConfig.html#accessToken) for more information about the API.

</details>

<details>
  <summary><strong>Change Log Level</strong></summary>
  <br>

The default log level is set to 'WARN' so that only warnings and errors are logged.

The default log level can be changed as follows:
- Change the log level programmatically by providing it under the DI token `LogLevel`:
  ```ts
  import {LogLevel} from 'solclientjs';
  
  @NgModule({
    providers: [
      {provide: LogLevel, useValue: LogLevel.WARN},
    ],
    ...
  })
  export class AppModule {
  }
  ```
- Change the log level at runtime via session storage by adding the following entry and then reloading the application:\
  key:   `angular-solace-message-client#loglevel`\
  value: `debug` // supported values are: trace | debug | info | warn | error | fatal

</details>

[menu-overview]: /README.md

[menu-getting-started]: /docs/site/getting-started.md

[menu-features]: /docs/site/features.md

[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme

[menu-contributing]: /CONTRIBUTING.md

[menu-changelog]: /docs/site/changelog/changelog.md
