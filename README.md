# @ivuorinen/stylelint-config <!-- omit in toc -->

[![npm package][npm-badge]][npm-link] [![license MIT][license-badge]][license-link] [![ivuorinen's Code Style][style-badge]][style-link]

> ivuorinen's shareable configuration for [`stylelint`][stylelint-link].

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [CSS <sub><sup>(Default)</sup></sub>](#css-subsupdefaultsupsub)
  - [SCSS](#scss)
- [Extending the config](#extending-the-config)
- [Documentations](#documentations)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Installation

Install `this config` as a _`devDependencies`_:

```sh
# npm
npm install @ivuorinen/stylelint-config --save-dev

# Yarn
yarn add @ivuorinen/stylelint-config --dev
```

After installing it, a _`.stylelintrc.json`_ file will be created automatically in the project's root folder with the following configuration:

```json
{
  "extends": ["@ivuorinen/stylelint-config/css"]
}
```

The file is only written when this package is a **direct** dependency of the
project being installed, and never when it arrives as a transitive dependency of
something else. It is also skipped when a stylelint config already exists. Every
outcome is logged during install, so if no file appears the reason is in the
install output.

To suppress it entirely, set `IVUORINEN_STYLELINT_NO_POSTINSTALL=1`. Note that
npm 11 gates install scripts by default, so on a first install you may see
`npm warn allow-scripts` instead of a config file — in that case just create the
file by hand with the contents above.

## Usage

This package provides configuration for CSS and SCSS, you can choose which one you want to extend.

Whitespace and formatting rules are not included — stylelint 16 removed them, and a formatter such as [Prettier][prettier-link] is the right tool for that job.

### CSS <sub><sup>(Default)</sup></sub>

```json
{
  "extends": ["@ivuorinen/stylelint-config/css"]
}
```

The bare package name is equivalent:

```json
{
  "extends": ["@ivuorinen/stylelint-config"]
}
```

### SCSS

```json
{
  "extends": ["@ivuorinen/stylelint-config/scss"]
}
```

The SCSS config enforces two rules about `@use`/`@forward` paths that are worth
calling out, because they were silently inert before `stylelint-scss` 7 renamed
them:

| Rule | Effect |
| --- | --- |
| `scss/load-partial-extension: 'never'` | `@use './tokens.scss'` errors; write `@use './tokens'` |
| `scss/load-no-partial-leading-underscore: true` | `@use './_mixins'` errors; write `@use './mixins'` |

## Extending the config

The defined rules can be modified by adding other configurations, plugins or custom rules:

```json
{
  "extends": ["@ivuorinen/stylelint-config/css", "some-other-config-you-use"],
  "rules": {
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "apply", "screen"]
      }
    ]
  }
}
```

SCSS consumers should configure `scss/at-rule-no-unknown` instead — the SCSS entry
point disables the core `at-rule-no-unknown` and delegates to the SCSS-aware
version.

## Documentations

Read the [stylelint docs][stylelint-docs-link] for more information.

## Contributing

If you are interested in helping contribute, please take a look at our [contribution guidelines][contributing-link] and open an [issue][issue-link] or [pull request][pull-request-link].

## Changelog

See [CHANGELOG][changelog-link] for a human-readable history of changes.

## License

Distributed under the MIT License. See [LICENSE][license-link] for more information.

### Dependency license note <!-- omit in toc -->

`svg-tags@1.0.0`, reached transitively via `stylelint`, ships no `license` field
in its `package.json`, so license scanners report it as `UNKNOWN`. Its repository
states MIT. Recorded here so consumers with a license allowlist can allow it
deliberately rather than treating it as an unreviewed gap. Every other package in
the tree is MIT or MIT-compatible.

[changelog-link]: https://github.com/ivuorinen/base-configs-stylelint/releases
[stylelint-docs-link]: https://stylelint.io
[stylelint-link]: https://github.com/stylelint/stylelint
[contributing-link]: https://github.com/ivuorinen/.github/blob/main/CONTRIBUTING.md
[issue-link]: https://github.com/ivuorinen/base-configs-stylelint/issues
[license-badge]: https://img.shields.io/github/license/ivuorinen/base-configs-stylelint?style=flat-square&labelColor=292a44&color=663399
[license-link]: ./LICENSE.md
[npm-badge]: https://img.shields.io/npm/v/@ivuorinen/stylelint-config?style=flat-square&labelColor=292a44&color=663399
[npm-link]: https://www.npmjs.com/package/@ivuorinen/stylelint-config
[prettier-link]: https://prettier.io
[pull-request-link]: https://github.com/ivuorinen/base-configs-stylelint/pulls
[style-badge]: https://img.shields.io/badge/code_style-ivuorinen%E2%80%99s-663399.svg?labelColor=292a44&style=flat-square
[style-link]: https://github.com/ivuorinen/base-configs-stylelint
