<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | [Getting Started][menu-getting-started] | [Features][menu-features] | [Try Me][menu-try-me] | Changelog | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Changelog

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





[menu-overview]: /README.md
[menu-getting-started]: /docs/site/getting-started.md
[menu-features]: /docs/site/features.md
[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme
[menu-contributing]: /CONTRIBUTING.md
[menu-changelog]: /docs/site/changelog/changelog.md
