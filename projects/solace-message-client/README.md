# Solace Message Client

Angular message client to communicate with a Solace messaging broker for sending and receiving messages using the
native [SMF protocol](https://docs.solace.com/PubSub-ConceptMaps/Component-Maps.htm#SMF) (Solace Message Format) over web socket. This library is based on the low-level Solace JavaScript
Messaging API provided by the [solclient](https://docs.solace.com/API-Developer-Online-Ref-Documentation/js/index.html) library.

This library is currently limited to topic-based communication. A queue API is not yet available. However, you can obtain the native Solace session to get the full functionality of the
underlying *solclient* library.


***

#### Quickstart

- [**Getting Started**](https://github.com/solacecommunity/angular-solace-message-client/blob/master/docs/site/getting-started.md) \
  Learn how to install and use this library in an Angular application.

- [**Try Me**](https://solacecommunity.github.io/angular-solace-message-client/api) \
  See this library in action. The *Try Me* application lets you connect to your message broker for publishing and receiving messages.

- [**API Documentation**](https://solacecommunity.github.io/angular-solace-message-client/api) \
  Consult our API documentation for a complete overview of the API.
  
* [**GitHub Repo**]( https://github.com/solacecommunity/angular-solace-message-client) \
  Visit our GitHub repository for more information about this library.

***

The sources for this package are in https://github.com/solacecommunity/angular-solace-message-client repo. Please file issues and pull requests against that repo.

License: MIT
