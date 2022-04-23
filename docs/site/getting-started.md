<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | Getting Started | [Features][menu-features] | [Try Me][menu-try-me] | [Changelog][menu-changelog] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Getting Started

This short manual explains how to install and use the library.

<details>
  <summary><strong>Step 1: Install the library from NPM</strong></summary>
  <br>

Install `@solace-community/angular-solace-message-client` and required modules using the NPM command-line tool.

```sh
npm install @solace-community/angular-solace-message-client solclientjs @scion/toolkit --save
```

> The library requires some peer dependencies to be installed. By using the above commands, those are installed as well.
</details>

<details>
  <summary><strong>Step 2: Configure the message client</strong></summary>
  <br>

Open your `app.module.ts` and import the `SolaceMessageClientModule` by calling `forRoot`, as following:

```typescript
import { SolaceMessageClientModule } from '@solace-community/angular-solace-message-client';

@NgModule({
  imports: [
    ...
    SolaceMessageClientModule.forRoot({
      url:      'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName:  'YOUR VPN',
      userName: 'YOUR USERNAME',
      password: 'YOUR PASSWORD',
    })
  ],
  ...
})
export class AppModule { }
```

Note to call `forRoot` only in a root injector, e.g., in app module. Calling it in a lazy-loaded module will throw a runtime error.

If you provide the config via `forRoot`, the first time you inject `SolaceMessageClient`, it connects to the Solace Message Broker. To be more flexible in providing the config, invoke this method without config. Then, programmatically connect to the Solace Message Broker by calling `SolaceMessageClient.connect` and passing the config. Typically, you would do this in an app initializer or the app component.

> See [feature overview][menu-features] section **Enable OAUTH2 authentication** for an example how to enable OAUTH authentication.

</details>

<details>
  <summary><strong>Step 3: Publish a message</strong></summary>
  <br>

Inject the service `SolaceMessageClient` into a component or service and publish a message to a topic, as following:

```typescript
import { SolaceMessageClientModule } from '@solace-community/angular-solace-message-client';

@Component(...)
public class YourComponent {

  constructor(solaceMessageClient: SolaceMessageClient) {
    // publishes the message '20°C' to the topic 'myhome/kitchen/temperature'
    solaceMessageClient.publish('myhome/livingroom/temperature', '20°C');
  }
}
```
</details>

<details>
  <summary><strong>Step 4: Receive messages</strong></summary>
  <br>

Inject the service `SolaceMessageClient` into a component or service and subscribe to a topic, as following:

```typescript
import { SolaceMessageClientModule } from '@solace-community/angular-solace-message-client';

@Component(...)
public class YourComponent {

  constructor(solaceMessageClient: SolaceMessageClient) {
    solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(envelope => {
      console.log(envelope);
    });
  }
}
```

> Topics are case-sensitive and consist of one or more segments, each separated by a forward slash. You can subscribe to an exact topic, or use wildcards (single-level `*` or multi-level `>`) to subscribe to multiple topics simultaneously. Refer to https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm for more information about the usage of wildcards.

In the following example, we subscribe to the temperature of any room.

```typescript
import { SolaceMessageClientModule } from '@solace-community/angular-solace-message-client';

@Component(...)
public class YourComponent {

  constructor(solaceMessageClient: SolaceMessageClient) {
    // For the second segment, the room, we use the single-level wildcard character.
    solaceMessageClient.observe$('myhome/*/temperature').subscribe(envelope => {
      console.log(envelope);
    });
  }
}
```

As an alternative to the single-level wildcard `*`, you can also use a named wildcard segment. A named wildcard segment starts with a colon (`:`) followed by an arbitrary segment name, allowing you to retrieve substituted values of wildcard segments when receiving a message.

```typescript
@Component(...)
public class YourComponent {

  constructor(solaceMessageClient: SolaceMessageClient) {
    solaceMessageClient.observe$('myhome/:room/temperature').subscribe(envelope => {
      const room: string = envelope.params.room
      console.log(envelope.message, room);
    });
  }
}
```

> For the actual Solace subscription, named wildcard segments are replaced with the single-level wildcard (`*`) segment.
</details>

[menu-overview]: /README.md
[menu-getting-started]: /docs/site/getting-started.md
[menu-features]: /docs/site/features.md
[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme
[menu-contributing]: /CONTRIBUTING.md
[menu-changelog]: /docs/site/changelog/changelog.md

