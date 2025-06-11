# [20.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/19.0.0...20.0.0) (2025-06-11)


### Features

* **solace-message-client:** add support for Angular 20 ([030314f](https://github.com/solacecommunity/angular-solace-message-client/commit/030314f6e5eb05df8db93aa9499547b542666bfc))


### Code Refactoring

* **solace-message-client:** remove deprecated API to manually connect and disconnect from the broker ([9a5b814](https://github.com/solacecommunity/angular-solace-message-client/commit/9a5b8143c9a3d82ce9b2f77787bd13c2f04e4b15)), closes [#70](https://github.com/solacecommunity/angular-solace-message-client/issues/70)


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 20 introduced a breaking change.
  To migrate:
  - Update your application to Angular 20. For detailed migration instructions, refer to Angular's update guide: https://v20.angular.dev/update-guide.
  - Remove `@types/events`, `@types/node`, and `long` from the dependencies in your `package.json` as not required anymore (since `solclientjs` version `10.16.0`)
  - Remove `node` from the `types` array in your `tsconfig` as not required anymore (since `solclientjs` version `10.16.0`)

* **solace-message-client:** Angular Solace Message Client now requires `@scion/toolkit` version `1.6.0` or higher.
  For more information, refer to the changelog of `@scion/toolkit`: https://github.com/SchweizerischeBundesbahnen/scion-toolkit/blob/master/CHANGELOG_TOOLKIT.md.

* **solace-message-client:** Angular Solace Message Client now requires `solclientjs` version `10.18.0` or higher.
  For more information, refer to the changelog of `solclientjs`: https://products.solace.com/download/JS_API_RN.

* **solace-message-client:** `provideSolaceMessageClient` now requires a config. Previously, no config was required if the app connected manually to the broker using the removed `connect` method.

* **solace-message-client:** Removed deprecated `connect` and `disconnect` methods of `SolaceMessageClient`.
  Initially, they allowed for a flexible configuration of the message client, which can now be done via a config function or separate environments.

  To migrate, pass a config to `provideSolaceMessageClient`, either as an object literal or via a function. The function can call `inject` to get any required dependencies and return the configuration synchronously or asynchronously, for example, to load it over the network.

  **Example for loading config asynchronously:**
  ```ts
  import {provideSolaceMessageClient} from '@solace-community/angular-solace-message-client';
  import {bootstrapApplication} from '@angular/platform-browser';
  import {HttpClient, provideHttpClient} from '@angular/common/http';
  import {inject} from '@angular/core';
  
  bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(),
      provideSolaceMessageClient(() => inject(HttpClient).get('path/to/config')),
    ],
  });
  ```

  A connection to the broker is established when the `SolaceMessageClient` is injected for the first time. To manually connect to a broker, create an environment. Different environments can be used to connect to different brokers.

  **Example for manually connecting to the broker:**
  ```ts
  import {provideSolaceMessageClient, SolaceMessageClient} from '@solace-community/angular-solace-message-client';
  import {createEnvironmentInjector, EnvironmentInjector, inject} from '@angular/core';
  
  // Configure the broker.
  const environment = createEnvironmentInjector(
    [provideSolaceMessageClient({url: 'wss://broker-url'})],
    inject(EnvironmentInjector),
  );
  
  // Connect to the broker by injecting `SolaceMessageClient`.
  const messageClient = environment.get(SolaceMessageClient);
  
  // Interact with the broker.
  messageClient.publish('topic', 'message');
  
  // Destroy the environment, disconnecting from the message broker.
  environment.destroy();
  ```
