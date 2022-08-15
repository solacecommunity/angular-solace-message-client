<a href="/README.md"><img src="/docs/site/logo.svg" height="80"></a>

| [Overview][menu-overview] | [Getting Started][menu-getting-started] | [Features][menu-features] | [Try Me][menu-try-me] | [Changelog][menu-changelog] | Contributing |  
| --- | --- | --- | --- | --- | --- |

## Contributing
We encourage other developers to join the project and contribute to making this library constantly better and more stable. If you are missing a feature, please create a feature request so we can discuss it and coordinate further development. To report a bug, please check existing issues first, and if found, leave a comment on the issue. Otherwise, file a bug or create a pull request with a proposed fix.

<details>
  <summary><strong>Submitting a Pull Request</strong></summary>
  <br>

This section explains how to submit a pull request.

1. Login to your GitHub account and fork the `solacecommunity/angular-solace-message-client` repo.
1. Make your changes in a new Git branch. Name your branch in the form `issue/xxx` with `xxx` as the related GitHub issue number. Before submitting the pull request, please make sure that you comply with our coding and commit guidelines.
1. Run the command `npm run before-push` to make sure that the project builds, passes all tests, and has no lint violations. Alternatively, you can also run the commands one by one, as following:
    - `npm run lint`\
      Lints all project files.
    - `npm run build`\
      Builds the project and related artifacts.
    - `npm run test:headless`\
      Runs all unit tests.
1. Commit your changes using a descriptive commit message that follows our commit guidelines.
1. Before submitting the pull request, ensure to have rebased your branch based on the master branch as we stick to the rebase policy to keep the repository history linear.
1. Push your branch to your fork on GitHub. In GitHub, send a pull request to `angular-solace-message-client:master`.
1. If we suggest changes, please amend your commit and force push it to your GitHub repository.

> When we receive a pull request, we will carefully review it and suggest changes if necessary. This may require triage and several iterations. Therefore, we kindly ask you to discuss proposed changes with us in advance via the GitHub issue.

</details>

<details>
  <summary><strong>Development</strong></summary>
  <br>

Make sure to use Node.js version 16.14.0 for contributing to this library. We suggest using [Node Version Manager](https://github.com/nvm-sh/nvm) if you need different Node.js versions for other projects.

For development, you can uncomment the section `PATH-OVERRIDE-FOR-DEVELOPMENT` in `tsconfig.json`. This allows running tests or serving applications without having to build dependent modules first.

The following is a summary of commands useful for development of `angular-solace-message-client`. See file `package.json` for a complete list of available NPM scripts.

### Commands for working on the solace-message-client library

- `npm run solace-message-client:lint`\
  Lints the library.

- `npm run solace-message-client:build`\
  Builds the library.

- `npm run solace-message-client:test`\
  Runs unit tests.

### Commands for working on the testing application (Try Me)

- `npm run solace-message-client-testing-app:serve`\
  Serves the testing app on [http://localhost:4200](http://localhost:4200).\
  Uncomment the section `PATH-OVERRIDE-FOR-DEVELOPMENT` in `tsconfig.json` to have hot module reloading support.

- `npm run solace-message-client-testing-app:build`\
  Builds the testing app into `dist` folder using the productive config.

- `npm run solace-message-client-testing-app:lint`\
  Lints the testing app.

### Commands for generating the project documentation

- `npm run solace-message-client:typedoc`\
  Generates the API documentation (TypeDoc) for the library. The output is written to `dist/solace-message-client-api`.

- `npm run changelog`\
  Generates the changelog based on the commit history. The output is written to `CHANGELOG.md`, which will be included in `docs/site/changelog/changelog.md` using the template `docs/site/changelog/changelog.template.md`.

</details>

<details>
  <summary><strong>Code Formatting</strong></summary>
  <br>

To ensure consistency within our code base, please use the following formatting settings.

- **For IntelliJ IDEA**\
  Import the code style settings of `.editorconfig.intellij.xml` located in the project root.

- **For other IDEs**\
  Import the code style settings of `.editorconfig` located in the project root.

</details>

<details>
  <summary><strong>Coding Guidelines</strong></summary>
  <br>

In additional to the linting rules, we have the following conventions:

- We believe in the [Best practices for a clean and performant Angular application](https://medium.freecodecamp.org/best-practices-for-a-clean-and-performant-angular-application-288e7b39eb6f) and the [Angular Style Guide](https://angular.io/guide/styleguide).
- We expect line endings to be Unix style (LF) only. We suggest that you set `core.autocrlf` to `false` so that Git does not perform any automatic conversions on both, checkout and commit, respectively. If you cloned the repository with `core.autocrlf=true`, you either need to manually convert the line endings back to `LF` or, which is the easier way, set `core.autocrlf` to `false` and clone the repo anew.
```sh
git config --global core.autocrlf false
```
- Observable names are suffixed with the dollar sign (`$`) to indicate that it is an `Observable` which we must subscribe to and unsubscribe from.
- We use explicit `public` and `private` visibility modifiers (except for constructors) to make the code more explicit.
- We write each RxJS operator on a separate line, except when piping a single RxJS operator. Then, we write it on the same line as the pipe method.
- We avoid nested RxJS subscriptions.
- We document all public API methods, constants, functions, classes or interfaces.
- We structure the CSS selectors in CSS files similar to the structure of the companion HTML file and favor the direct descendant selector (`>`) over the non-restrictive descendant selector (` `), except if there are good reasons not to do it. This gives us a visual by only reading the CSS file.
- When referencing CSS classes from within E2E tests, we always prefix them with `e2e-`. We never reference e2e prefixed CSS classes in stylesheets.

</details>

<details>
  <summary><strong>Commit Guidelines</strong></summary>
  <br>

We believe in a compact and well written Git commit history. Every commit should be a logically separated changeset. We use the commit messages to generate the changelog.

Each commit message consists of a **header**, a **summary** and a **footer**.  The header has a special format that includes a **type**, an optional **scope**, and a **subject**, as following:

```
<type>(<scope>): <subject>

[optional summary]

[optional footer]
```

<details>
  <summary><strong>Type</strong></summary>

- `feat`: new feature
- `fix`: bug fix
- `docs`: changes to the documentation
- `refactor`: changes that neither fixes a bug nor adds a feature
- `perf`: changes that improve performance
- `test`: adding missing tests, refactoring tests; no production code change
- `chore`: other changes like formatting, updating the license, updating dependencies, removal of deprecations, etc
- `ci`: changes to our CI configuration files and scripts
- `revert`: revert of a previous commit
- `release`: publish a new release
</details>

<details>
  <summary><strong>Scope</strong></summary>

The scope should be the name of the NPM package or application affected by the change.

- `solace-message-client`: If the change affects the `@solace-community/angular-solace-message-client` NPM package.
- `tryme`: If the change affects the test application.
</details>

<details>
  <summary><strong>Subject</strong></summary>

The subject contains a succinct description of the change and follows the following rules:
- written in the imperative, present tense ("change" not "changed" nor "changes")
- starts with a lowercase letter
- has no punctuation at the end
</details>

<details>
  <summary><strong>Summary</strong></summary>

The summary describes the change. You can include the motivation for the change and contrast this with previous behavior.
</details>

<details>
  <summary><strong>Footer</strong></summary>

In the footer, reference the GitHub issue and optionally close it with the `Closes` keyword, as following:

```
closes #xxx
```

And finally, add notes about breaking changes, if there are any. Breaking changes start with the keyword `BREAKING CHANGE: `. The rest of the commit message is then used to describe the breaking change and should contain information about the migration.

```
BREAKING CHANGE: Removed deprecated API for ...

To migrate:
- do ...
- do ...
  ```
</details>
</details>

<details>
  <summary><strong>Deprecation Policy</strong></summary>
  <br>

You can deprecate API in any version. However, it will still be present in the next major release. Removal of deprecated API will occur only in a major release.

When deprecating API, mark it with the `@deprecated` JSDoc comment tag and include the current library version. Optionally, you can also specify which API to use instead, as following:

```ts
/**
 * @deprecated since version 2.0. Use {@link otherMethod} instead.
 */
function someMethod(): void {
}

```  

</details>

<details>
  <summary><strong>Deployments</strong></summary>
  <br>

We have the following artifacts that are deployed from our [GitHub Actions workflow][link-github-actions-workflow] when a release commit is merged into the master branch.

- [API Documentation (TypeDoc)](https://solacecommunity.github.io/angular-solace-message-client/api)
- [Testing Application (Try Me)](https://solacecommunity.github.io/angular-solace-message-client/tryme)

</details>

<details>
  <summary><strong>NPM Packages</strong></summary>
  <br>

We publish our packages to the NPM registry under the [solace-community](https://www.npmjs.com/org/solace-community) organization. Packages are published on behalf of the Solace collaborator user.

We have the following packages:
- https://www.npmjs.com/package/@solace-community/angular-solace-message-client

</details>

<details>
  <summary><strong>Versioning</strong></summary>
  <br>  

We follow the same SemVer (Semantic Versioning) philosophy as Angular, with major versions being released at the same time as major versions of the Angular framework.

### Semantic Versioning Scheme (SemVer)

**Major Version:**\
Major versions contain breaking changes.

**Minor Version**\
Minor versions add new features or deprecate existing features without breaking changes.

**Patch Level**\
Patch versions fix bugs or optimize existing features without breaking changes.

</details>

<details>
  <summary><strong>Release Checklist</strong></summary>
  <br>

This chapter describes the tasks to publish a new release to NPM.

1. Update `/projects/solace-message-client/package.json` with the new version.
1. Run `npm run changelog` to generate the changelog. Then, review the generated changelog carefully and correct typos and formatting errors, if any.
1. Commit the changed files using the following commit message: `release(solace-message-client): vX.X.X`. Replace `X.X.X` with the current version. Later, when merging the branch into the master branch, a commit message of this format triggers the release action in our [GitHub Actions workflow][link-github-actions-workflow].
1. Push the commit to the branch `release/X.X.X` and submit a pull request to the master branch. Replace `X.X.X` with the current version.
1. When merged into the master branch, the release action in our [GitHub Actions workflow][link-github-actions-workflow] creates a Git release tag, publishes the package to NPM, and deploys related applications.
1. Verify that:
- **@solace-community/angular-solace-message-client** is published to: https://www.npmjs.com/package/@solace-community/angular-solace-message-client.
- **API Documentation (TypeDoc)** is deployed to: https://solacecommunity.github.io/angular-solace-message-client/api
- **Testing Application (Try Me)** is deployed to: https://solacecommunity.github.io/angular-solace-message-client/tryme

</details>

[link-github-actions-workflow]: https://github.com/solacecommunity/angular-solace-message-client/actions

[menu-overview]: /README.md
[menu-getting-started]: /docs/site/getting-started.md
[menu-features]: /docs/site/features.md
[menu-try-me]: https://solacecommunity.github.io/angular-solace-message-client/tryme
[menu-contributing]: /CONTRIBUTING.md
[menu-changelog]: /docs/site/changelog/changelog.md
