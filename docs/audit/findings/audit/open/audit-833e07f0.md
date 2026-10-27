---
id: audit-833e07f0
auditor: audit
severity: low
category: tests
area: .github/workflows/test.yml
status: open
found: 2026-10-27
location: .github/workflows/test.yml:29
location_sha: 70a71aea2492d549
---

# CI tests one of the Node lines engines admits

## Problem

The smoke test runs on the single Node version in `.nvmrc` (v24). The 20.x and 22.x lines that `engines` admits never run it.

## Evidence

`test.yml:29` `node-version-file: ".nvmrc"`; `.nvmrc` is `v24`; `engines.node` is `>=20.19.0`.

## Impact

A stylelint or plugin release that raises its floor ships green and breaks consumers on 20.19 or 22.

## Fix

Add a matrix `node-version: ["20.19.0", "22", "24", "26"]` to test.yml and update the `required-checks` ruleset
20004983, whose `Smoke Test / Smoke Test` context changes name.

## Status — workflow changed, ruleset pending (2026-10-27)

`fix/audit-2026-10` 9da3316 runs the smoke test on Node 20.19.0, 22, 24 and 26;
it passes locally on 20.19.0 and 24. The `required-checks` ruleset 20004983
still requires `Smoke Test / Smoke Test`, which the matrix no longer produces;
replace it with `Smoke Test / Smoke Test (Node 20.19.0)`, `(Node 22)`,
`(Node 24)` and `(Node 26)` when the branch is pushed, then resolve this finding.
