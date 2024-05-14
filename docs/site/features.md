<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | [Getting Started][menu-getting-started] | Features | [Changelog][menu-changelog] | [Try Me][menu-try-me] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Features

This page gives you an overview of features provided by Angular Solace Message Client library. If a feature you need is not listed here, please check the API of [SolaceMessageClient](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html), or file a GitHub issue otherwise.

<details>
  <summary><strong>Send Message to a Topic Destination</strong></summary>
  <br>

When publishing a message to a topic, it will be transported to all consumers subscribed to the topic. A message may contain unstructured byte data, or a structured container.

**Publish Binary Message**
```ts
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {inject} from '@angular/core';

inject(SolaceMessageClient).publish('myhome/livingroom/temperature', '20°C');

// `solclientjs` encodes `string` content to latin1 encoded binary attachment. Alternatively, you can directly pass binary content, as follows:
inject(SolaceMessageClient).publish('myhome/livingroom/temperature', new TextEncoder().encode('20°C'));
```

**Publish Structured Text Message**
```ts
import {inject} from '@angular/core';
import {SDTField, SDTFieldType} from 'solclientjs';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

const sdtField = SDTField.create(SDTFieldType.STRING, '20°C');
inject(SolaceMessageClient).publish('myhome/livingroom/temperature', sdtField);
```

**Publish Message With Headers**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).publish('myhome/livingroom/temperature', '20°C', {
  headers: new Map().set('bearer', '<<ACCESS_TOKEN>>'),
});
```

**Publish Guaranteed Message**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {MessageDeliveryModeType} from 'solclientjs';

inject(SolaceMessageClient).publish('myhome/livingroom/temperature', '20°C', {
  deliveryMode: MessageDeliveryModeType.PERSISTENT,
});
```

**Intercept Message Before Publish**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Message, MessageDumpFlag} from 'solclientjs';

inject(SolaceMessageClient).publish('myhome/livingroom/temperature', '20°C', {
  intercept: (msg: Message) => {
    console.log('>>> msg to be published', msg.dump(MessageDumpFlag.MSGDUMP_FULL));
  },
});
```

> Refer to [SolaceMessageClient#publish](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#publish) for more information about the API.

</details>

<details>
  <summary><strong>Receive Messages Published to a Topic</strong></summary>
  <br>

**Receive Messages on Exact Topic**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).observe$('myhome/livingroom/temperature').subscribe(envelope => {
  console.log('Received temperature for livingroom', envelope.message);
});
```

**Receive Messages for any Room (Wildcard Segments)**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).observe$('myhome/*/temperature').subscribe(envelope => {
  console.log('Received temperature', envelope.message);
});
```

**Receive Messages for any Room (Named Wildcard Segments)**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).observe$('myhome/:room/temperature').subscribe(envelope => {
  console.log(`Received temperature for room ${envelope.params.get('room')}`, envelope.message);
});
```

**Read Message Headers**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).observe$('myhome/*/temperature').subscribe(envelope => {
  const accessToken = envelope.headers.get('ACCESS_TOKEN');
});
```

> Refer to [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#observe_) for more information about the API.

</details>

<details>
  <summary><strong>Consume Messages Published to a Topic via a Non-Durable Topic Endpoint</strong></summary>
  <br>

Instead of observing messages published to a topic via [SolaceMessageClient#observe$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#observe_), you can consume messages via a temporary, non-durable topic endpoint, so that messages are not lost even in the event of short connection interruptions as messages are retained on the broker until consumed by the consumer. The lifecycle of a non-durable topic endpoint is bound to the client that created it, with an additional 60s in case of unexpected disconnect.

```ts
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {QueueDescriptor, QueueType, SolclientFactory} from 'solclientjs';
import {inject} from '@angular/core';

// Consume messages sent to topic 'topic'.
inject(SolaceMessageClient).consume$('topic').subscribe(envelope => {
  console.log('message consumed', envelope.message);
});

// Above code uses a convenience API by passing the topic as `string` literal, which is equivalent to the following code.
inject(SolaceMessageClient).consume$({
  topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
  queueDescriptor: new QueueDescriptor({type: QueueType.TOPIC_ENDPOINT, durable: false}),
}).subscribe(envelope => {
  console.log('message consumed', envelope.message);
});
```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#consume_) for more information about the API.

It is important to understand that a topic is not the same thing as a topic endpoint. A topic is a message property the event broker uses to route a message to its destination. Topic endpoints, unlike topics, are objects that define the storage of messages for a consuming application. Topic endpoints are more closely related to queues than to topics. Messages cannot be published directly to topic endpoints, but only indirectly via topics. For more information, refer to https://solace.com/blog/queues-vs-topic-endpoints.

</details>

<details>
  <summary><strong>Send Message to a Queue Endpoint</strong></summary>
  <br>

A queue is typically used in a point-to-point (P2P) messaging environment. A queue differs from the topic distribution mechanism that the message is transported to exactly a single consumer, i.e., the message is load balanced to a single consumer in round‑robin fashion, or for exclusive queues, it is always transported to the same subscription. When sending a message to a queue, the broker retains the message until it is consumed, or until it expires.

> Refer to [SolaceMessageClient#publish](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#publish) for more information about the API.

**Send Binary Message**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {SolclientFactory} from 'solclientjs';

const queue = SolclientFactory.createDurableQueueDestination('queue');
inject(SolaceMessageClient).publish(queue, '20°C');

// `solclientjs` encodes `string` content to latin1 encoded binary attachment. Alternatively, you can directly pass binary content, as follows:
inject(SolaceMessageClient).publish(queue, new TextEncoder().encode('20°C'));
```

**Send Structured Text Message**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {SDTField, SDTFieldType, SolclientFactory} from 'solclientjs';

const queue = SolclientFactory.createDurableQueueDestination('queue');
const sdtField = SDTField.create(SDTFieldType.STRING, '20°C');

inject(SolaceMessageClient).publish(queue, sdtField);
```

**Send Message With Headers**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {SolclientFactory} from 'solclientjs';

const queue = SolclientFactory.createDurableQueueDestination('queue');
inject(SolaceMessageClient).publish(queue, '20°C', {headers: new Map().set('bearer', '<<ACCESS_TOKEN>>')});
```

**Send Guaranteed Message**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {MessageDeliveryModeType, SolclientFactory} from 'solclientjs';

const queue = SolclientFactory.createDurableQueueDestination('queue');
inject(SolaceMessageClient).publish(queue, '20°C', {
  deliveryMode: MessageDeliveryModeType.PERSISTENT,
});
```

**Intercept Message Before Send**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {Message, MessageDumpFlag, SolclientFactory} from 'solclientjs';

const queue = SolclientFactory.createDurableQueueDestination('queue');
inject(SolaceMessageClient).publish(queue, '20°C', {
  intercept: (msg: Message) => {
    console.log('>>> msg to be sent', msg.dump(MessageDumpFlag.MSGDUMP_FULL));
  },
});
```

</details>

<details>
  <summary><strong>Consume Messages Sent to a Durable Queue</strong></summary>
  <br>

```ts
import {QueueDescriptor, QueueType} from 'solclientjs';
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).consume$({
  queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
}).subscribe(envelope => {
  console.log('message', envelope.message);
});
```

> Refer to [SolaceMessageClient#consume$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#consume_) for more information about the API.

</details>

<details>
  <summary><strong>Browse Messages Sent to a Durable Queue</strong></summary>
  <br>
Browses messages in a queue, without removing/consuming the messages.

```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {QueueDescriptor, QueueType} from 'solclientjs';

// Browse messages.
inject(SolaceMessageClient).browse$('queue').subscribe(envelope => {
  console.log('message', envelope.message);
});

// Above code uses a convenience API by passing the queue as `string` literal, which is equivalent to the following code.
inject(SolaceMessageClient).browse$({
  queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
}).subscribe(envelope => {
  console.log('message', envelope.message);
});
```

> Refer to [SolaceMessageClient#browse$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#browse_) for more information about the API.

</details>

<details>
  <summary><strong>Request-Response Communication</strong></summary>
  <br>
The following snippet illustrates how to send a request and receive the response.

**Initiate Request-Reply Communication**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).request$('request-topic', 'request data').subscribe(reply => {
  console.log('reply received', reply);
});
```

**Reply To Requests**
```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

const solaceMessageClient = inject(SolaceMessageClient);

// Listen for requests sent to the request topic.
solaceMessageClient.observe$('request-topic').subscribe(request => {
  // Reply to the request.
  solaceMessageClient.reply(request.message, 'reply');

  // Above code uses a convenience API to directly respond to a request.
  // Alternatively, you could answer to the request as following.
  solaceMessageClient.publish(request.message.getReplyTo()!, 'reply', {
    markAsReply: true,
    correlationId: request.message.getCorrelationId() ?? undefined,
  });
});

```

> Refer to [SolaceMessageClient#request$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#request_) for more information about the API.

</details>

<details>
  <summary><strong>Enable OAuth 2.0 Authentication</strong></summary>
  <br>

Enable OAuth 2.0 authentication in the config passed to `provideSolaceMessageClient` function.

1. Set `SolaceMessageClientConfig.authenticationScheme` to `AuthenticationScheme.OAUTH2`.
2. Register a function in `SolaceMessageClientConfig.accessToken` that provides the access token.

The function should return an Observable that emits the user's access token upon subscription, and then continuously emits it when the token is renewed.
The Observable should never complete, enabling the connection to the broker to be re-established in the event of a network interruption.

**Example:**

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {AuthenticationScheme} from 'solclientjs';
import {inject} from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideSolaceMessageClient({
      url: 'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName: 'YOUR VPN',
      authenticationScheme: AuthenticationScheme.OAUTH2, // enable OAuth 2.0
      accessToken: () => inject(AuthService).accessToken$, // provide access token
    }),
  ],
});
```

> The function can call `inject` to get any required dependencies.

</details>

<details>
  <summary><strong>Advanced Configuration</strong></summary>
  <br>

This chapter covers some advanced topics for configuring the Solace Message Client.

<details>
  <summary><strong>Control Session Creation</strong></summary>
  <br>

The Solace session is created by the `SolaceSessionProvider`, which initializes `SolclientFactory` and creates session instances based on the properties passed to the `provideSolaceMessageClient` function.

The default session provider can be replaced as follows:

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideSolaceMessageClient, SolaceSessionProvider} from '@solace-community/angular-solace-message-client';

bootstrapApplication(AppComponent, {
  providers: [
    provideSolaceMessageClient({
      url: 'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName: 'YOUR VPN',
    }),
    // Replace default session provider 
    {provide: SolaceSessionProvider, useClass: CustomSolaceSessionProvider},
  ],
});
```

A custom implementation could look as follows: 

```ts
import {Injectable} from '@angular/core';
import {LogLevel, Session, SessionProperties, SolclientFactory, SolclientFactoryProfiles, SolclientFactoryProperties} from 'solclientjs';
import {SolaceSessionProvider} from '@solace-community/angular-solace-message-client';

@Injectable()
export class CustomSolaceSessionProvider implements SolaceSessionProvider {

  constructor() {
    const factoryProperties = new SolclientFactoryProperties();
    factoryProperties.profile = SolclientFactoryProfiles.version10_5;
    factoryProperties.logLevel = LogLevel.WARN;
    SolclientFactory.init(factoryProperties);
  }

  public provide(sessionProperties: SessionProperties): Session {
    return SolclientFactory.createSession(sessionProperties);
  }
}
```
</details>

<details>
  <summary><strong>Connect to Multiple Solace Message Brokers</strong></summary>
  <br>

An application is not limited to connecting to a single Solace Message Broker. Different injection environments can be used to connect to different brokers.

Angular injection environments form a hierarchy, inheriting providers from parent environments. An environment can register new providers or replace inherited providers. A child environment is created through routing or programmatically using `createEnvironmentInjector`.

Example for connecting to two different brokers:

```ts
import {createEnvironmentInjector, EnvironmentInjector, inject} from '@angular/core';
import {provideSolaceMessageClient, SolaceMessageClient} from '@solace-community/angular-solace-message-client';

// Create environment to provide message client for broker 1.
const environment1 = createEnvironmentInjector([provideSolaceMessageClient({url: 'broker-1'})], inject(EnvironmentInjector));
// Inject message client.
const messageClient1 = environment1.get(SolaceMessageClient);
// Publish message to broker 1.
messageClient1.publish('topic', 'message for broker 1');

// Create environment to provide message client for broker 2.
const environment2 = createEnvironmentInjector([provideSolaceMessageClient({url: 'broker-2'})], inject(EnvironmentInjector));
// Inject message client.
const messageClient2 = environment2.get(SolaceMessageClient);
// Publish message to broker 2.
messageClient2.publish('topic', 'message for broker 2');

// Destroy environments to destroy provided `SolaceMessageClient` instances. 
environment1.destroy();
environment2.destroy();
```

</details>

<details>
  <summary><strong>Control Angular Zone</strong></summary>
  <br>

Messages are received in the zone in which subscribed to the Observable.

The following example receives messages outside the Angular zone:

```ts
import {inject, NgZone} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

// Run the following code outside of Angular
inject(NgZone).runOutsideAngular(() => {
  // Subscribe to topic outside of Angular
  inject(SolaceMessageClient).observe$('topic').subscribe(() => {
    // Message is received outside of Angular
    NgZone.assertNotInAngularZone();
  });
});
```

</details>

<details>
  <summary><strong>Monitor Connectivity to the Message Broker</strong></summary>
  <br>

```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).connected$.subscribe(connected => {
  console.log('connected to the broker', connected);
});
```

> Refer to [SolaceMessageClient#connected$](https://solacecommunity.github.io/angular-solace-message-client/api/classes/SolaceMessageClient.html#connected_) for more information about the API.

</details>

<details>
  <summary><strong>Reference to Solace Session</strong></summary>
  <br>

A reference to the native Solace session can be obtained via `SolaceMessageClient.session` to have full control over the functionality of `solclient`.  

```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

const session = await inject(SolaceMessageClient).session
```

> Refer to [SolaceMessageClient#session](https://solacecommunity.github.io/angular-solace-message-client/api/interfaces/Session.html) for more information about the API.

</details>

<details>
  <summary><strong>Log Level</strong></summary>
  <br>

The default log level is set to `WARN` so that only warnings and errors are logged.

The default log level can be changed as follows:
```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {LogLevel} from 'solclientjs';

bootstrapApplication(AppComponent, {
  providers: [
    provideSolaceMessageClient(),
    {provide: LogLevel, useValue: LogLevel.INFO}, // Add this line
  ],
});
```
To change the log level at runtime, add the `angular-solace-message-client#loglevel` entry to session storage and reload the application. Supported log levels are: `trace`, `debug`, `info`, `warn`, `error` and `fatal`.

```
Storage Key: `angular-solace-message-client#loglevel`
Storage Value: `info`
```

</details>

</details>

[menu-overview]: /README.md

[menu-getting-started]: /docs/site/getting-started.md

[menu-features]: /docs/site/features.md

[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme

[menu-contributing]: /CONTRIBUTING.md

[menu-changelog]: /docs/site/changelog/changelog.md
