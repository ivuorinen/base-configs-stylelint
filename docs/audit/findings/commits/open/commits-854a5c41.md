---
id: commits-854a5c41
auditor: commits
severity: medium
category: conventions
area: .releaserc.json
status: open
found: 2026-07-25
---

# Identical changes release under three different rules depending on an arbitrary scope

## Problem

`releaseRules` in `@ivuorinen/semantic-release-config` keys release decisions on
the commit **scope**, but Renovate emits two different scopes for the same class
of change. The same file, changed the same way, produces no release, a patch, or
a minor depending on which scope the bot happened to use.

```json
"releaseRules": [
  { "breaking": true, "type": "chore", "scope": "deps",    "release": "minor" },
  {                   "type": "chore", "scope": "deps",    "release": "patch" },
  {                   "type": "chore", "scope": "actions", "release": false   }
]
```

## Evidence

`actions/cache` bumps in this repository's own history, all three scopes in use:

```text
chore(actions): update actions/cache action (v6.0.0 → v6.1.0) (#163)   -> release: false  -> no release
chore(deps):    update actions/cache action (v5.0.2 → v5.0.3) (#97)    -> release: patch  -> patch
chore(deps)!:   update actions/cache action (v5.0.5 → v6.0.0) (#162)   -> release: minor  -> v1.2.0
```

`actions/checkout` and `actions/setup-node` show the same split:

```text
chore(actions): update actions/checkout action (v7.0.0 → v7.0.1) (#175)
chore(deps)!:   update actions/checkout action (v6.0.3 → v7.0.0) (#159)
chore(actions): update actions/setup-node action (v6.3.0 → v6.4.0) (#147)
chore(deps)!:   update actions/setup-node action (v6.4.0 → v7.0.0) (#168)
```

Three of the last four minor releases were caused **entirely** by GitHub Action
version bumps:

```text
v1.1.0  d60ed3b  chore(deps)!: update actions/checkout action (v6.0.3 → v7.0.0)
v1.2.0  44f9b08  chore(deps)!: update actions/cache action (v5.0.5 → v6.0.0)
v1.3.0  2a7ab7d  chore(deps)!: update actions/setup-node action (v6.4.0 → v7.0.0)
```

None of those can affect a consumer. `files` is
`["css/*", "scss/*", "scripts/*"]`, so `.github/workflows/**` is not in the
published tarball — the artifact at v1.2.0 is byte-identical to v1.1.2 apart
from the version field.

The rule also runs the other way. Renovate labels a change to this package's
**own declared support range** with the same `chore(deps)!` prefix:

```text
$ git show 986a6a9 -- package.json
-    "stylelint": "^16.26.1",
+    "stylelint": "^17.0.0",
```

`986a6a9 chore(deps)!: update stylelint (16.26.1 → 17.0.0) (#87)`

Under `{breaking: true, type: chore, scope: deps, release: "minor"}` that
consumer-facing support change also releases as a minor. The rule cannot
distinguish "bumped a CI action" from "dropped support for a stylelint major",
because the distinction is in *which files changed*, not in the message.

## Impact

1. **Version inflation.** Consumers see minor releases with identical
   payloads and changelogs full of CI noise, so the version number stops
   signalling anything about the package.
2. **Under-versioning of real breaks.** A genuine support-range change ships as
   a minor. A consumer on `^1.x` pinned to stylelint 16 can receive a config
   that requires stylelint 17 without a major bump — and, because stylelint is
   a hard dependency rather than a peer (`deps-d7bddd01`), without an install
   warning either.
3. **Non-determinism.** Whether a release happens at all depends on Renovate's
   scope choice, which is not under this repo's control.

## Fix

Stop keying releases on scope, and restrict release-triggering paths instead.
Renovate's config is the right place, because it knows which manager produced
the change. In `.github/renovate.json`, force the scope per manager:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>ivuorinen/renovate-config"],
  "packageRules": [
    {
      "matchManagers": ["github-actions", "pre-commit"],
      "semanticCommitType": "chore",
      "semanticCommitScope": "actions"
    },
    {
      "matchManagers": ["npm"],
      "semanticCommitType": "chore",
      "semanticCommitScope": "deps"
    }
  ]
}
```

With scopes made deterministic, the existing `releaseRules` become correct:
`chore(actions)` never releases, `chore(deps)` releases patch, and a genuinely
breaking npm change is written by hand as `fix!:`/`feat!:` so it takes the
preset's default major.

Then drop the `{breaking: true, type: chore, scope: deps, release: "minor"}`
rule — with actions excluded, a breaking npm dependency change should not be
downgraded from major.

Verify with a dry run before trusting it:

```sh
npx semantic-release --dry-run --no-ci
```

## Status — not applied (2026-07-25)

The proposed `packageRules` fix was written, validated, and then **reverted**
because it cannot be shown to work.

`renovate-config-validator` accepts the file, but only by validating it as
*global* config. The published schema disagrees: dereferencing
`properties.packageRules.items` (which is `{allOf: [...]}`, not a flat
`properties` map) yields 33 permitted keys, and `semanticCommitType` /
`semanticCommitScope` are not among them —

```text
ALL valid packageRules keys:
allowedVersions, changelogUrl, description, enabled, fetchChangeLogs,
matchBaseBranches, matchCategories, matchConfidence, matchCurrentAge,
matchCurrentValue, matchCurrentVersion, matchDatasources, matchDepNames,
matchDepTypes, matchFileNames, matchJsonata, matchManagers, matchNewValue,
matchPackageNames, matchRegistryUrls, matchRepositories, matchSourceUrls,
matchUpdateTypes, overrideDatasource, overrideDepName, overridePackageName,
prPriority, replacementName, replacementNameTemplate, replacementVersion,
replacementVersionTemplate, sourceDirectory, sourceUrl
```

Both keys are valid only at the top level. A `packageRules` entry using them
would therefore be a silent no-op, which is worse than the current state —
it would look fixed while changing nothing.

Two things are needed before this can be closed, neither doable from here:

1. Confirm against a real Renovate run (or the Renovate docs for the version
   in use) whether per-manager `semanticCommitScope` is honoured despite its
   absence from the schema.
2. The `releaseRules` themselves live in `@ivuorinen/semantic-release-config`,
   a separate repository. The rule
   `{breaking: true, type: "chore", scope: "deps", release: "minor"}` is what
   downgrades a breaking dependency change to a minor, and it must be changed
   there, not here.

Everything in the Evidence section above still holds and is unchanged.
