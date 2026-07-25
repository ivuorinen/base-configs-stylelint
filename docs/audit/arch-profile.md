# Architecture Profile

Detected by `/nitpicker arch-profile` on 2026-07-25 for
`@ivuorinen/stylelint-config`.

## Pattern

**Shareable-config package.** No application layers, no runtime services. The
whole artifact is declarative data plus one install-time script.

```text
package.json  exports map ──┬─→ ./css   → css/index.cjs   (base rule set)
                            └─→ ./scss  → scss/index.cjs  (extends ./css + scss plugin rules)
                                            ↑
                            *.mjs shims re-export the .cjs for the import condition

scripts/postinstall.cjs   install-time side effect, writes a consumer .stylelintrc.json
test/smoke.mjs            out-of-tree verification: packs, installs, runs the real CLI
```

## Layers and allowed direction

| Layer | Files | May depend on |
| --- | --- | --- |
| Entry points | `package.json` `exports` | config modules only |
| ESM shims | `css/index.mjs`, `scss/index.mjs` | their sibling `.cjs` only |
| Config modules | `css/index.cjs`, `scss/index.cjs` | stylelint configs/plugins; `scss` → `css` |
| Install script | `scripts/postinstall.cjs` | node stdlib, `@ivuorinen/config-checker` |
| Verification | `test/smoke.mjs` | node stdlib + a packed tarball; never the repo tree directly |

Direction is one-way: `scss` → `css`, never the reverse. `css/index.cjs` must
stay free of SCSS-specific rules so the CSS entry point is usable standalone.

`test/smoke.mjs` deliberately sits outside the layer graph — it consumes the
package the way npm does (pack → install → run the CLI) rather than importing
the modules, which is what makes it able to catch `exports`-map and
`extends`-resolution defects.

## Constraints this shape imposes

1. **`extends` strings are module specifiers, not paths.** Cross-module
   composition inside the package must use `require.resolve('../css/index.cjs')`
   so the resolved absolute path also anchors `plugins` resolution inside the
   package. A bare relative string does not resolve.
2. **Rule names are validated against the consumer's stylelint**, not this
   package's. A rule the consumer's stylelint does not know is a lint-time
   error, not an install-time one.
3. **Every published entry point is public API.** The `exports` map, the rule
   set, and the postinstall's emitted specifier are all consumer-visible
   surface; changes to them are semver-relevant.
4. **The postinstall writes outside its own tree**, into `INIT_CWD`. That makes
   it the only part of the package with an effect on a directory it does not
   own — the highest-risk component despite being the smallest.

## Audit result against this profile

No layer violations. `scss/index.cjs` → `css/index.cjs` is the one cross-module
edge and it runs in the permitted direction. Findings against constraints 1–4
are filed separately (`errors-767bc7a4`, `errors-a2721a05`,
`contract-a269f60f`, `deps-d7bddd01`).
