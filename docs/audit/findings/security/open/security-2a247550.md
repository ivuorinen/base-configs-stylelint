---
id: security-2a247550
auditor: security
severity: low
category: security
area: node_modules/@typescript/typescript-linux-x64
status: open
found: 2026-07-30
---

# golang.org/x/text 0.38.0 is compiled into a prebuilt tsc binary and cannot be fixed here

## Problem

`golang.org/x/text@v0.38.0` is vulnerable to GO-2026-5970 (High, fixed in
0.39.0) and is compiled into a prebuilt Go binary shipped inside a node package:

```text
node_modules/@typescript/typescript-linux-x64/lib/tsc
```

Nothing in this repository can change that version. It is baked into a binary
artifact published by upstream TypeScript, so remediation requires TypeScript to
rebuild against x/text 0.39.0 and cut a release.

## Evidence

Only `grype` finds it, because it inspects binary contents rather than the
lockfile -- `osv-scanner` and `trivy`, which read `yarn.lock`, cannot see a
dependency that has no lockfile entry:

```text
$ grype dir:.
vuln     : GO-2026-5970 High
artifact : golang.org/x/text v0.38.0 go-module
location : /node_modules/@typescript/typescript-linux-x64/lib/tsc
```

Ancestry:

```text
@ivuorinen/stylelint-config (workspace)
└─ @ivuorinen/eslint-config 1.4.0            <- devDependency
   └─ typescript 7.0.2
      └─ @typescript/typescript-linux-x64 7.0.2
```

The published tarball contains 8 files and none of them is a binary
(`npm pack --dry-run`), so the artifact never ships to consumers.

## Impact

Effectively none for consumers or for CI as configured. The binary is the
Go-based `tsc` from TypeScript 7; it is dev-only, is not in the published
tarball, and is not invoked by any workflow in this repository -- there is no
TypeScript in the source tree, only the toolchain pulled transitively through
`@ivuorinen/eslint-config`.

Recorded rather than fixed because it will keep appearing in any
binary-inspecting scan of this repository, and knowing it is upstream and
unreachable is what stops it being re-triaged from scratch each time.

## Fix

Nothing to change here. Two options, both external:

1. Wait for TypeScript to publish a build linked against `golang.org/x/text`
   0.39.0, then let Renovate bump `@ivuorinen/eslint-config` or `typescript`.
2. If it must stop appearing in scans before then, drop the transitive
   TypeScript toolchain -- but it arrives via `@ivuorinen/eslint-config`, so
   that belongs in that package, not here.

Re-check with `grype dir:.` after any `@ivuorinen/eslint-config` or
`typescript` bump; resolve this finding when the artifact reports 0.39.0 or
later.
