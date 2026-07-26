---
id: contract-a269f60f
auditor: contract
severity: advisory
category: correctness
area: scss/index.cjs
status: open
found: 2026-07-25
---

# Renamed scss/load-* rules newly enforce checks that were inert, on a patch release

## Problem

Commit `f1a01ac` renames two rules that stylelint-scss 7 removed:

```diff
-    'scss/at-import-no-partial-leading-underscore': true,
-    'scss/at-import-partial-extension': 'never',
+    'scss/load-no-partial-leading-underscore': true,
+    'scss/load-partial-extension': 'never',
```

The old names were unknown to `stylelint-scss@7`, so they enforced nothing.
The new names are live. This is the correct fix, but it changes observable
behaviour for consumers of `@ivuorinen/stylelint-config/scss`, and the commit
is typed `fix:` — semantic-release will cut a **patch**.

## Evidence

The old names are absent from the installed plugin and the new ones present:

```text
$ ls node_modules/stylelint-scss/src/rules | grep -iE 'load|import'
at-import-partial-extension-allowed-list
at-import-partial-extension-disallowed-list
load-no-partial-leading-underscore
load-partial-extension
no-duplicate-load-rules
partial-no-import
```

`load-partial-extension` accepts the same primary options as its predecessor,
confirmed in `node_modules/stylelint-scss/src/rules/load-partial-extension/index.js`:

```js
      possible: ["always", "never"]
```

With `'never'` now live, an SCSS file that previously passed:

```scss
@use './tokens.scss';
```

now errors — `Unexpected extension ".scss" in @use`. Likewise
`load-no-partial-leading-underscore: true` now rejects `@use './_mixins'`.

## Impact

A consumer who runs `npm update` expecting a patch can get a red build from
`.scss` files they did not touch. The severity is low in practice — the rules
express the project's intended SCSS conventions and the affected syntax is
mechanically fixable — but "patch release starts failing my build" is the
surprise semver exists to prevent.

This is an advisory, not a defect: reverting to inert rule names would be
worse, and the rules were always *meant* to be enforced.

## Fix

No code change. Make the behaviour change visible in the release:

Add a `BREAKING CHANGE:` footer if a major is acceptable, or — better for a
config package — keep the patch and add the note to the commit body so it
reaches the generated changelog:

```text
fix: make the package usable on a clean install

...

Note for SCSS consumers: scss/at-import-no-partial-leading-underscore and
scss/at-import-partial-extension were silently inert under stylelint-scss 7.
They are restored under their current names scss/load-no-partial-leading-underscore
and scss/load-partial-extension, so `@use './x.scss'` and `@use './_x'` now
error as originally intended. Run `stylelint --fix` or drop the extensions and
leading underscores from @use/@forward paths.
```

Then document the two rules in the README's SCSS section so the enforcement is
discoverable without reading the changelog.

## Status — partially applied (2026-07-25)

The documentation half is done. `README.md` now carries a table in the SCSS
section spelling out both rules and the syntax they reject:

| Rule | Effect |
| --- | --- |
| `scss/load-partial-extension: 'never'` | `@use './tokens.scss'` errors; write `@use './tokens'` |
| `scss/load-no-partial-leading-underscore: true` | `@use './_mixins'` errors; write `@use './mixins'` |

The changelog half is **not** applied. Adding the note requires amending the
commit message on `f1a01ac` (or writing it into the release commit), which is
a release decision for the maintainer rather than an automated edit — the
choice between shipping this as a patch with a prominent note or as a major
is a judgement about consumer impact, not a defect to be fixed.

Suggested body text is in the Fix section above.
