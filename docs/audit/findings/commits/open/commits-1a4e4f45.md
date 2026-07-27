---
id: commits-1a4e4f45
auditor: commits
severity: medium
category: conventions
area: @ivuorinen/semantic-release-config
status: open
found: 2026-07-27
---

# A breaking npm dependency change releases as a minor, not a major

## Problem

The shared release config maps any breaking `chore(deps)` commit down to a
minor:

```json
{ "breaking": true, "type": "chore", "scope": "deps", "release": "minor" }
```

That rule exists to stop Renovate's `chore(deps)!` CI-action bumps forcing a
major. With action and pre-commit updates now pinned to `chore(actions)`
(see `commits-854a5c41`), the rule no longer serves that purpose here — but it
still catches genuinely breaking **npm** dependency changes and downgrades them.

## Evidence

Confirmed against this repository's real `releaseRules` using
`@semantic-release/commit-analyzer`:

```text
  minor       <- chore(deps)!: update stylelint (16.26.1 → 17.0.0)
```

A change to the declared support range is exactly that shape. Renovate labels
it `chore(deps)!` — the same prefix it used for CI actions — and this repository
has already taken one:

```text
$ git show 986a6a9 -- package.json
-    "stylelint": "^16.26.1",
+    "stylelint": "^17.0.0",
```

`986a6a9 chore(deps)!: update stylelint (16.26.1 → 17.0.0) (#87)`

## Impact

A consumer on `^1.x` can receive a config that requires a different stylelint
major without a major-version signal. This is the same class of mis-versioning
that shipped the peerDependency change as 1.3.7: the version understates what
changed, and `^` ranges carry it automatically.

## Fix

Remove the rule now that scope pinning handles the CI case:

```diff
   "releaseRules": [
-    { "breaking": true, "type": "chore", "scope": "deps", "release": "minor" },
     { "type": "chore", "scope": "deps", "release": "patch" },
     { "type": "chore", "scope": "actions", "release": false }
   ]
```

A breaking `chore(deps)!` then falls through to the conventionalcommits default
and takes a major, which is what it earns.

This cannot be done from this repository — `releaseRules` live in
`@ivuorinen/semantic-release-config`, and `.releaserc.json` cannot override just
that key because a local `plugins` array replaces the extended one wholesale
rather than merging. The change belongs in that package. Verify there with:

```sh
npx semantic-release --dry-run --no-ci
```
