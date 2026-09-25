# @ivuorinen/stylelint-config <!-- omit in toc -->

[![npm package][npm-badge]][npm-link] [![license MIT][license-badge]][license-link] [![ivuorinen's Code Style][style-badge]][style-link]

> ivuorinen's shareable configuration for [`stylelint`][stylelint-link].

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [CSS <sub><sup>(Default)</sup></sub>](#css-default)
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

Create a _`.stylelintrc.json`_ in the project's root folder with the following configuration:

```json
{
  "extends": ["@ivuorinen/stylelint-config/css"]
}
```

With npm, a `postinstall` script writes exactly this file for you. It only runs
when this package is a **direct** dependency of the project being installed,
never when it arrives as a transitive dependency of something else, and it is
skipped when a stylelint config already exists; each outcome is logged in the
install output. npm 11 runs the script but warns that it is not covered by
`allowScripts`.

Other package managers do not run it:

- **Yarn 4** does not run dependency install scripts, so nothing is written or
  logged — create the file by hand as above.
- **pnpm** refuses unapproved install scripts and fails the install until you
  allow this package with `pnpm approve-builds`.

To suppress the script, set `IVUORINEN_STYLELINT_NO_POSTINSTALL` to `1`, `true`
or `yes`; any other value (including `0` and `false`) leaves it enabled.

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

If you are interested in helping contribute, please open an [issue][issue-link] or [pull request][pull-request-link].

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
[issue-link]: https://github.com/ivuorinen/base-configs-stylelint/issues
[license-badge]: https://img.shields.io/github/license/ivuorinen/base-configs-stylelint?style=flat-square&labelColor=292a44&color=663399
[license-link]: ./LICENSE.md
[npm-badge]: https://img.shields.io/npm/v/@ivuorinen/stylelint-config?style=flat-square&labelColor=292a44&color=663399
[npm-link]: https://www.npmjs.com/package/@ivuorinen/stylelint-config
[prettier-link]: https://prettier.io
[pull-request-link]: https://github.com/ivuorinen/base-configs-stylelint/pulls
[style-badge]: https://img.shields.io/badge/code_style-ivuorinen%E2%80%99s-663399.svg?labelColor=292a44&style=flat-square
[style-link]: https://github.com/ivuorinen/base-configs-stylelint
