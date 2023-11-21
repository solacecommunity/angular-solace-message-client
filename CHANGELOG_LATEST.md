# [17.0.0](https://github.com/solacecommunity/angular-solace-message-client/compare/16.0.0...17.0.0) (2023-11-21)


### Dependencies

* **solace-message-client:** update @solace-community/angular-solace-message-client to Angular 17 ([49b8c86](https://github.com/solacecommunity/angular-solace-message-client/commit/49b8c8689cc98b55c5a4a13ea23d5d38b8fbce50)), closes [#68](https://github.com/solacecommunity/angular-solace-message-client/issues/68)


### BREAKING CHANGES

* **solace-message-client:** Updating `@solace-community/angular-solace-message-client` to Angular 17 introduced a breaking change.

  To migrate:
    - Update your application to Angular 17; for detailed migration instructions, refer to https://v17.angular.io/guide/update-to-latest-version;
    - Update `solclientjs` to version 10.15.0;
    - `solclientjs` now requires type definitions for node. In your tsconfig, add `node` to the `types` array in `compilerOptions`. If you have not specified `types`, no manual registration of `node` is required, since without `types` array all @types packages are included in the build.
