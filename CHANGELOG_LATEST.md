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


