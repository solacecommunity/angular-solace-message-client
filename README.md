<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| Overview | [Getting Started][menu-getting-started] | [Features][menu-features] | [Try Me][menu-try-me] | [Changelog][menu-changelog] | [Contributing][menu-contributing] |  
| --- | --- | --- | --- | --- | --- |

## Angular Solace Message Client

Angular message client to communicate with a Solace messaging broker for sending and receiving messages using the native [SMF protocol](https://docs.solace.com/PubSub-ConceptMaps/Component-Maps.htm#SMF) (Solace Message Format) over web socket. This library is based on the low-level Solace JavaScript Messaging API provided by the [solclient][link-solclient] library.

This library provides fundamental messaging API to exchange messages via topic destinations, queue and topic endpoints. To get the full functionality of the underlying *solclient* library, you can obtain the native Solace session.

***

#### Quickstart

- [**Getting Started**][menu-getting-started]\
  Learn how to install and use this library in an Angular application.
  
- [**Features**][menu-features]\
  Get an overview of features of this library.

- [**Try Me**][menu-try-me]\
  See this library in action. The *Try Me* application lets you connect to your message broker for publishing and receiving messages.

- [**API Documentation**](https://solacecommunity.github.io/angular-solace-message-client/api)\
  Consult our API documentation for a complete overview of the API.

#### Solace Documentation

- [**PubSub+ for Developers**](https://www.solace.dev)\
  Learn how to create event-driven apps and microservices.

- [**solclient API**][link-solclient]\
  Consult the API documentation of the Solace JavaScript Messaging API (solclient) used by this library.

***


[![Project version](https://img.shields.io/npm/v/@solace-community/angular-solace-message-client.svg)][link-download]
[![Continuous Integration and Delivery][link-github-actions-workflow:status]][link-github-actions-workflow]
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)


[link-download]: https://www.npmjs.com/package/@solace-community/angular-solace-message-client
[link-github-actions-workflow]: https://github.com/solacecommunity/angular-solace-message-client/actions
[link-github-actions-workflow:status]: https://github.com/solacecommunity/angular-solace-message-client/actions/workflows/workflow.yml/badge.svg
[link-solclient]: https://docs.solace.com/API-Developer-Online-Ref-Documentation/js/index.html

[menu-overview]: /README.md
[menu-getting-started]: /docs/site/getting-started.md
[menu-features]: /docs/site/features.md
[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme
[menu-contributing]: /CONTRIBUTING.md
[menu-changelog]: /docs/site/changelog/changelog.md
