<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | Getting Started | [Features][menu-features] | [Try Me][menu-try-me] | [Changelog][menu-changelog] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Getting Started

This short manual explains how to install and use the library.

<details>
  <summary><strong>Step 1: Install the Library from NPM</strong></summary>
  <br>

Run the following commands to install the Solace Message Client and required dependencies.

```sh
npm install @solace-community/angular-solace-message-client solclientjs @scion/toolkit --save
npm install @types/events@3 long@5 @types/node --save-dev // required by solclientjs
```

> `solclientjs` requires type definitions for node. In your tsconfig, add `node` to the `types` array in `compilerOptions`. If you have not specified `types`, no manual registration of `node` is required, since without `types` array all @types packages are included in the build.
</details>

<details>
  <summary><strong>Step 2: Register Solace Message Client Providers</strong></summary>
  <br>

Open `app.config.ts` and register Solace Message Client providers.

```ts
import {ApplicationConfig} from '@angular/core';
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSolaceMessageClient({
      url:      'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName:  'YOUR VPN',
      userName: 'YOUR USERNAME',
      password: 'YOUR PASSWORD',
    })
  ],
};
```

If you are not using `app.config.ts`, register the Solace Message Client directly in `main.ts`.

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';

bootstrapApplication(AppComponent, {
  providers: [
    provideSolaceMessageClient({
      url: 'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName: 'YOUR VPN',
      userName: 'YOUR USERNAME',
      password: 'YOUR PASSWORD',
    })
  ],
});
```

Or for `NgModule` based applications:

```ts
import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {NgModule} from '@angular/core';

@NgModule({
  providers: [
    provideSolaceMessageClient({
      url: 'wss://YOUR-SOLACE-BROKER-URL:443',
      vpnName: 'YOUR VPN',
      userName: 'YOUR USERNAME',
      password: 'YOUR PASSWORD',
    }),
  ],
  bootstrap: [
    AppComponent,
  ],
})
export class AppModule {
}
```

If providing a config to `provideSolaceMessageClient`, the `SolaceMessageClient` will automatically connect to the broker the first time it is injected. Alternatively, for more flexibility in providing the config, do not pass a config and connect manually using `SolaceMessageClient.connect`.

> See [feature overview][menu-features] section **Enable OAUTH2 authentication** for an example how to enable OAUTH authentication.

</details>

<details>
  <summary><strong>Step 3: Publish a Message</strong></summary>
  <br>

Inject `SolaceMessageClient` and publish a message to a topic:

```ts
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {inject} from '@angular/core';

// Publish the message '20°C' to the topic 'myhome/livingroom/temperature'.
inject(SolaceMessageClient).publish('myhome/livingroom/temperature', '20°C');
```
</details>

<details>
  <summary><strong>Step 4: Receive Messages</strong></summary>
  <br>

Inject `SolaceMessageClient` and subscribe to a topic:

```ts
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {inject} from '@angular/core';

// Subscribe to topic 'myhome/livingroom/temperature'.
inject(SolaceMessageClient).observe$('myhome/livingroom/temperature').subscribe(envelope => {
  console.log(envelope);
});
```

> Topics are case-sensitive and consist of one or more segments, each separated by a forward slash. You can subscribe to an exact topic, or use wildcards (single-level `*` or multi-level `>`) to subscribe to multiple topics simultaneously. Refer to https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm for more information about the usage of wildcards.

The following example subscribes to the temperature of any room.

```ts
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';
import {inject} from '@angular/core';

// For the second segment, the room, we use the single-level wildcard character.
inject(SolaceMessageClient).observe$('myhome/*/temperature').subscribe(envelope => {
  console.log(envelope);
});
```

As an alternative to the single-level wildcard `*`, named wildcard segments can be used. A named wildcard segment begins with a colon (`:`) followed by a name. Substituted segments can be read from the received message.

```ts
import {inject} from '@angular/core';
import {SolaceMessageClient} from '@solace-community/angular-solace-message-client';

inject(SolaceMessageClient).observe$('myhome/:room/temperature').subscribe(envelope => {
  const room: string = envelope.params.room;
  console.log(envelope.message, room);
});
```

> For the actual Solace subscription, named wildcard segments are replaced with the single-level wildcard (`*`) segment.
</details>

[menu-overview]: /README.md
[menu-getting-started]: /docs/site/getting-started.md
[menu-features]: /docs/site/features.md
[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme
[menu-contributing]: /CONTRIBUTING.md
[menu-changelog]: /docs/site/changelog/changelog.md

