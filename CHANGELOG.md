# [19.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/18.0.0...19.0.0) (2024-12-05)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 19 ([e623821](https://github.com/solacecommunity/angular-solace-message-client/commit/e623821b5127d1193868730858eeffc008d4d944))


### Chore

* **solace-message-client:** remove deprecated APIs ([393c003](https://github.com/solacecommunity/angular-solace-message-client/commit/393c003fd4d651a03e214537368de05a80b6d172))


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 19 introduced a breaking change.

  To migrate:
  - Update your application to Angular 19; for detailed migration instructions, refer to https://v19.angular.dev/update-guide;
  - Update `solclientjs` to version 10.17.1.
* **solace-message-client:** Removing the deprecated APIs introduced breaking changes.

  The following APIs have been removed:
  - `SolaceMessageClientModule.forRoot` => register Angular Solace Message Client using `provideSolaceMessageClient` function instead;
  - `SolaceMessageClientModule.forChild` => register Angular Solace Message Client using `provideSolaceMessageClient` function instead;
  - `OAuthAccessTokenProvider` => use `OAuthAccessTokenFn` instead;
  - `BrowseOptions.emitOutsideAngularZone` => messages are received in the zone in which subscribed to the Observable. To receive messages outside the Angular zone, subscribe to the Observable outside the Angular zone, otherwise inside the Angular zone;
  - `ConsumeOptions.emitOutsideAngularZone` => messages are received in the zone in which subscribed to the Observable. To receive messages outside the Angular zone, subscribe to the Observable outside the Angular zone, otherwise inside the Angular zone;
  - `ObserveOptions.emitOutsideAngularZone` => messages are received in the zone in which subscribed to the Observable. To receive messages outside the Angular zone, subscribe to the Observable outside the Angular zone, otherwise inside the Angular zone;
  - `RequestOptions.emitOutsideAngularZone` => replies are received in the zone in which subscribed to the Observable. To receive replies outside the Angular zone, subscribe to the Observable outside the Angular zone, otherwise inside the Angular zone;



# [18.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/17.1.0...18.0.0) (2024-06-03)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 18 ([bacf6aa](https://github.com/solacecommunity/angular-solace-message-client/commit/bacf6aaaefff9d078b2560033f164a533a0a80c8))


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 18 introduced a breaking change.

  To migrate:
  - Update your application to Angular 18; for detailed migration instructions, refer to https://v18.angular.dev/update-guide;
  - Update `solclientjs` to version 10.16.0;



# [17.1.0](https://github.com/solacecommunity/angular-solace-message-client/compare/17.0.1...17.1.0) (2024-05-14)


### Features

* **solace-message-client:** deprecate class-based access token provider in favor of functional access token provider ([94a3f0e](https://github.com/solacecommunity/angular-solace-message-client/commit/94a3f0e837d3a2789d2cd51a802e6903918f56ec))
* **solace-message-client:** provide function to set up Solace Message Client ([d9be295](https://github.com/solacecommunity/angular-solace-message-client/commit/d9be29599fd465a679a30112049d65fd817ab04a))
* **solace-message-client:** receive messages in the zone in which subscribed for messages ([944b10c](https://github.com/solacecommunity/angular-solace-message-client/commit/944b10c10d16427dcda716282717ea6a5f5600b0))
* **solace-message-client:** support connecting to multiple Solace message brokers ([c832b00](https://github.com/solacecommunity/angular-solace-message-client/commit/c832b0041d0dfcb92e8816db5f6341d7f223a181)), closes [#71](https://github.com/solacecommunity/angular-solace-message-client/issues/71)
* **solace-message-client:** support loading config asynchronously ([1be10e6](https://github.com/solacecommunity/angular-solace-message-client/commit/1be10e6822e1ba05e7a8c5121486de41a0a3fe6b))



## [17.0.1](https://github.com/solacecommunity/angular-solace-message-client/compare/17.0.0...17.0.1) (2024-05-07)


### Bug Fixes

* **solace-message-client:** support subscriptions with #share and #noexport ([fa161bc](https://github.com/solacecommunity/angular-solace-message-client/commit/fa161bc4e4541f57234a21d1467fd2e1c9828f57))



# [17.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/16.0.0...17.0.0) (2023-11-21)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 17 ([49b8c86](https://github.com/solacecommunity/angular-solace-message-client/commit/49b8c8689cc98b55c5a4a13ea23d5d38b8fbce50)), closes [#68](https://github.com/solacecommunity/angular-solace-message-client/issues/68)


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 17 introduced a breaking change.

  To migrate:
  - Update your application to Angular 17; for detailed migration instructions, refer to https://v17.angular.io/guide/update-to-latest-version;
  - Update `solclientjs` to version 10.15.0;
  - `solclientjs` now requires type definitions for node. In your tsconfig, add `node` to the `types` array in `compilerOptions`. If you have not specified `types`, no manual registration of `node` is required, since without `types` array all @types packages are included in the build.



# [16.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/15.0.0...16.0.0) (2023-05-17)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 16 ([73a5edc](https://github.com/solacecommunity/angular-solace-message-client/commit/73a5edc554c59a496aeb0a67cae6407df5cccf69)), closes [#60](https://github.com/solacecommunity/angular-solace-message-client/issues/60)


### Features

* **testapp:** improve accessibility of testing app ([7f91a5c](https://github.com/solacecommunity/angular-solace-message-client/commit/7f91a5c06d12647db340662cb4533cb424c81a21))


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 16 introduced a breaking change.

  To migrate:
  - update your application to Angular 16; for detailed migration instructions, refer to https://v16.angular.io/guide/update-to-latest-version;
  - update `solclientjs` to version 10.13.0;



# [15.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/14.0.1...15.0.0) (2022-12-20)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 15 ([4638ed2](https://github.com/solacecommunity/angular-solace-message-client/commit/4638ed218f9c3b71b9d0a9943c38543a9daef5ba)), closes [#52](https://github.com/solacecommunity/angular-solace-message-client/issues/52)


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 15 introduced a breaking change.

  To migrate:
  - update your application to Angular 15; for detailed migration instructions, refer to https://v15.angular.io/guide/update-to-latest-version;



## [14.0.1](https://github.com/solacecommunity/angular-solace-message-client/compare/14.0.0...14.0.1) (2022-11-23)


### Bug Fixes

* **solace-message-client:** do not eagerly construct `SolaceMessageClient` ([82f73ed](https://github.com/solacecommunity/angular-solace-message-client/commit/82f73ed8888714e240504d41059e5a8bd275e18e)), closes [#53](https://github.com/solacecommunity/angular-solace-message-client/issues/53)



# [14.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/13.1.0...14.0.0) (2022-08-16)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 14 ([6c48828](https://github.com/solacecommunity/angular-solace-message-client/commit/6c488280bb55eace73486b959a7046e1d3399f7f)), closes [#49](https://github.com/solacecommunity/angular-solace-message-client/issues/49)


### Features

* **tryme:** use Solace sponsored broker as default broker ([f4879be](https://github.com/solacecommunity/angular-solace-message-client/commit/f4879be62ca6b41f15b105b50cd2e817b56f063e))


### Chore

* **solace-message-client:** remove deprecated API `ObserveOptions#requestTimeout` ([813cf2d](https://github.com/solacecommunity/angular-solace-message-client/commit/813cf2dec4f1ee81e2213d7e112f351a1c46f0cb))
* **solace-message-client:** remove deprecated API `SolaceMessageClient#enqueue` ([7f9125c](https://github.com/solacecommunity/angular-solace-message-client/commit/7f9125c1d2f73f67ba6a835ef5d22fecfd3ac512))

### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 14 introduced a breaking change.

  To migrate:
  - update your application to Angular 14; for detailed migration instructions, refer to https://v14.angular.io/guide/update-to-latest-version;
  - update @scion/toolkit to version 1.0.0 using the following command: `npm install @scion/toolkit@latest --save`. Note that the toolkit was previously released as pre-releases of version `13.0.0` or older; for detailed migration instructions, refer to https://github.com/SchweizerischeBundesbahnen/scion-toolkit/blob/master/CHANGELOG_TOOLKIT.md

* **solace-message-client:** Removing the deprecated API `ObserveOptions#requestTimeout` introduced a breaking change.

  To migrate, use `ObserveOptions#subscribeTimeout` instead.
 
* **solace-message-client:** Removing the deprecated API `SolaceMessageClient#enqueue` introduced a breaking change.

  To send a message to a queue, use `SolaceMessageClient#publish` instead and pass the queue destination. The queue destination can be constructed using `SolclientFactory` as follows: `SolclientFactory.createDurableQueueDestination('queue')`.



# [13.1.0](https://github.com/solacecommunity/angular-solace-message-client/compare/13.0.0...13.1.0) (2022-04-24)


### Bug Fixes

* **tryme:** do not require username and password when authenticating via OAUTH ([478d2b3](https://github.com/solacecommunity/angular-solace-message-client/commit/478d2b3e901117e93de3d56227146ea0895eea8e))


### Features

* **solace-message-client:** add API for OAUTH 2 authentication ([8090648](https://github.com/solacecommunity/angular-solace-message-client/commit/80906488e800ad00f3e80599470c5bddb12b1969)), closes [#39](https://github.com/solacecommunity/angular-solace-message-client/issues/39)
* **solace-message-client:** add API for request-response communication ([dcd831d](https://github.com/solacecommunity/angular-solace-message-client/commit/dcd831dcd3bbf3c8afce61c3480785ee3fd9dbf6)), closes [#38](https://github.com/solacecommunity/angular-solace-message-client/issues/38)
* **solace-message-client:** allow changing the log level ([7ee0155](https://github.com/solacecommunity/angular-solace-message-client/commit/7ee01556cd84f1b21755b8aac8b6db39718c7858))
* **solace-message-client:** migrate to "solclientjs" type definitions ([7ce7212](https://github.com/solacecommunity/angular-solace-message-client/commit/7ce7212223299894bb8ea6a447337da4f172a442)), closes [#37](https://github.com/solacecommunity/angular-solace-message-client/issues/37)


### BREAKING CHANGES

* **solace-message-client:** migrating to "solclientjs" type definitions introduced a breaking change.

  To migrate:
  - install `solclientjs@10.10.0` using the NPM command line, as follows: `npm install solclientjs@10.10.0 --save`
  - install `@types/events` using the NPM command line since required by solclientjs typings, as follows:  `npm install @types/events --save-dev`
  - install `@types/long` using the NPM command line since required by solclientjs typings, as follows: `npm install @types/long --save-dev`
  - import solclientjs specific types from `solclientjs` instead of `@solace-community/angular-solace-message-client`
  - construct solclientjs specific objects via `SolclientFactory` instead of `SolaceObjectFactory`
  - construct `SDTField` via `SDTField.create(...)` instead of `SolaceObjectFactory.createSDTField(...)` factory method;
  - construct `SDTMapContainer` via `new SDTMapContainer()` instead of `SolaceObjectFactory.createSDTMapContainer()` factory method
  - when subscribing to a queue, you need to pass the queue spec via `QueueDescriptor` instance instead of an object literal, as follows:
    ```ts
    messageClient.consume$({
     queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
     queueProperties: undefined, // necessary until solclientjs changes it to optional
    });
    ```
  - when browsing a queue, you need to pass the queue spec via `QueueDescriptor` instance instead of an object literal, as follows:
    ```ts
    messageClient.browse$({
      queueDescriptor: new QueueDescriptor({type: QueueType.QUEUE, name: 'queue'}),
    });
    ```
  - For more information about known typedef issues, see [issue/37](https://github.com/solacecommunity/angular-solace-message-client/issues/37#issuecomment-1094693407)



# [13.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/12.0.1...13.0.0) (2022-04-10)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 13 and migrate to RxJS 7.5 ([4d5029f](https://github.com/solacecommunity/angular-solace-message-client/commit/4d5029fc92d39721f35ad166eebd30b9da050683)), closes [#34](https://github.com/solacecommunity/angular-solace-message-client/issues/34)


### BREAKING CHANGES

* **solace-message-client:** updating `@solace-community/angular-solace-message-client` to Angular 13 and RxJS 7.5  introduced a breaking change.

  To migrate:
  - update your application to Angular 13; for detailed migration instructions, refer to https://github.com/angular/angular/blob/master/CHANGELOG.md.
  - migrate your application to RxJS 7.5; for detailed migration instructions, refer to https://rxjs.dev/6-to-7-change-summary.
  - update @scion/toolkit to version 13; for detailed migration instructions, refer to https://github.com/SchweizerischeBundesbahnen/scion-toolkit/blob/master/CHANGELOG.md.


## [12.0.1](https://github.com/solacecommunity/angular-solace-message-client/compare/12.0.0...12.0.1) (2021-11-15)


### Features

* **solace-message-client:** allow controlling if to receive messages outside the Angular zone ([6399eca](https://github.com/solacecommunity/angular-solace-message-client/commit/6399eca398c3ce61dd8a54d993c8a5a32b7e78af)), closes [#30](https://github.com/solacecommunity/angular-solace-message-client/issues/30)



# [12.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/11.0.1...12.0.0) (2021-09-08)

### Chore

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 12 ([913ae8a](https://github.com/solacecommunity/angular-solace-message-client/commit/913ae8a0264529ecf5c52cb625c1045bdb9537eb))

## [11.0.1](https://github.com/solacecommunity/angular-solace-message-client/compare/11.0.0...11.0.1) (2021-08-20)


### Bug Fixes

* **solace-message-client:** disconnect from the broker gracefully ([c66c154](https://github.com/solacecommunity/angular-solace-message-client/commit/c66c154c4e2354d9c8c74bdecc8a9281547f8ab5))
* **testapp:** mask password field ([9494653](https://github.com/solacecommunity/angular-solace-message-client/commit/94946535dd543101d313b694871229b47246abd1))


### Code Refactoring

* **solace-message-client:** remove automatic marshalling of message payload into JSON ([f40d0cb](https://github.com/solacecommunity/angular-solace-message-client/commit/f40d0cb2865a07c43ead10314c4da17f2a64f21a))


### Features

* **solace-message-client:** add convenience API for passing and receiving message headers ([d6450da](https://github.com/solacecommunity/angular-solace-message-client/commit/d6450da035f02a5ada28a1f9f9c37607fbe69550))
* **solace-message-client:** add Solace typedef for `Session`, `MessageConsumer`, `QueueBrowser`, and related objects ([2e3b8ab](https://github.com/solacecommunity/angular-solace-message-client/commit/2e3b8ab41550554bdc5a86911b94af74a94d4360))
* **solace-message-client:** allow browsing messages in a queue, without removing/consuming the messages ([c3bc031](https://github.com/solacecommunity/angular-solace-message-client/commit/c3bc031be851364274f1f11d1579a7efcf884a06))
* **solace-message-client:** allow consuming messages sent to a queue or topic endpoint ([b377ed5](https://github.com/solacecommunity/angular-solace-message-client/commit/b377ed58ccd603925e04455dd1b4de774f1a8089))
* **solace-message-client:** allow intercepting a message before sending it to the broker ([df8e7ad](https://github.com/solacecommunity/angular-solace-message-client/commit/df8e7ad29170d39234e0b67ecc0fa9e85bc84fde))
* **solace-message-client:** notify when actually subscribed to a destination ([245697e](https://github.com/solacecommunity/angular-solace-message-client/commit/245697e0bcdc3a19ef65b8f1211db74d6d350892)), closes [#16](https://github.com/solacecommunity/angular-solace-message-client/issues/16)
* **solace-message-client:** provide access to the message consumer object if connecting to a queue or topic endpoint ([b37c0bf](https://github.com/solacecommunity/angular-solace-message-client/commit/b37c0bf4112bb1658a22f6e3dfd5ee7ef7bbc8e0))
* **solace-message-client:** resolve guaranteed messaging promise after acknowledged by the broker ([15fc874](https://github.com/solacecommunity/angular-solace-message-client/commit/15fc87423db1f4a627686bb0dec93bd69b96cfce))
* **solace-message-client:** support sending messages to a queue ([ab901cd](https://github.com/solacecommunity/angular-solace-message-client/commit/ab901cd112c6b96e80d4c4b324f914e8ce7fe2b3))
* **testapp:** add toggle to follow message tail ([55a517d](https://github.com/solacecommunity/angular-solace-message-client/commit/55a517dab27ea9a8e05fe135b379af6ad0a4aa0b))
* **testapp:** allow sending empty messages ([9c260e8](https://github.com/solacecommunity/angular-solace-message-client/commit/9c260e8f256c0e2db772d582c018cf9a561f9715))
* **testapp:** display content of zipped messages ([a119c65](https://github.com/solacecommunity/angular-solace-message-client/commit/a119c6590881a215345ce960d48bc0b2204302d9))
* **testapp:** display message content in a viewport ([db13feb](https://github.com/solacecommunity/angular-solace-message-client/commit/db13febf82b5b5d2465ac88913fed243a1d0ed32))
* **testapp:** log error when the connection to the broker fails ([64052ff](https://github.com/solacecommunity/angular-solace-message-client/commit/64052ff5c538fd036b26a32a021c9e8afe0713f0))
* **testapp:** persist session connect properties in local storage ([59d328f](https://github.com/solacecommunity/angular-solace-message-client/commit/59d328ffeb4dfb3fde148625024033d1ff18af94))
* **testapp:** retry connecting during initial connection setup ([cdf1ebe](https://github.com/solacecommunity/angular-solace-message-client/commit/cdf1ebe87d79d96e4a5f9add8403a4aa865bd827))


### BREAKING CHANGES

* **solace-message-client:** Refactoring the API for publishing messages introduced following breaking change:
  - message payload is no longer automatically marshalled to JSON;
  - removed option to set the message body format; instead, it is derived from passed data automatically;
    if passing structured data in the form of a `SDTField`, data is transported as structured message of the type
    `TEXT`, `MAP`, or `STREAM`, or as binary message otherwise;
  - removed RxJS operator `mapToObject` for unmarshalling received JSON data;
  
  To migrate:
  - to send JSON serialized data (formerly via `MessageBodyFormat.JSON` or by default), you need to pass serialized data instead of the object literal;
  - to send a structured text message (formerly via `MessageBodyFormat.TEXT`), add transfer data to a `SDTField` of the type `STRING`, as following: `solaceMessageClient.publish('topic', SolaceObjectFactory.createSDTField(SDTFieldType.STRING, 'payload'))`;
  - to send binary data (formerly via `MessageBodyFormat.BINARY`), pass transfer data either as string, array buffer like object, or data view instead;
  - if used a `format` function to convert data into a structured container (Structured Data Type), pass transfer data in the form of a `SDTField` instead;
  - if used `mapToObject` RxJS operator to unmarshall received JSON data into a JavaScript object literal, you need to unmarshall received data yourself;



# [11.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/d5b275bc4787f0afb0bfc7f4500c7b18e16eb9b6...11.0.0) (2021-03-18)


### Bug Fixes

* **solace-message-client:** do not lose subscription when a topic is re-subscribed in quick succession ([659ee26](https://github.com/solacecommunity/angular-solace-message-client/commit/659ee2698e66c0352cf3353dec658aebe0a56b28)), closes [#7](https://github.com/solacecommunity/angular-solace-message-client/issues/7)


### Features

* **solace-message-client:** initial contribution of Angular Solace Message Client library ([d5b275b](https://github.com/solacecommunity/angular-solace-message-client/commit/d5b275bc4787f0afb0bfc7f4500c7b18e16eb9b6))



