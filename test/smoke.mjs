/**
 * End-to-end smoke test: packs this repo, installs the tarball into a throwaway
 * fixture, and runs the real stylelint CLI through every published specifier.
 *
 * This has to go through a real install. Importing the config object in-repo
 * exercises none of what actually broke in 1.3.5: a wrong `exports` subpath,
 * an `extends` entry stylelint cannot resolve, and rules stylelint deleted.
 *
 * Assertions come in pairs. Clean fixtures must exit 0, and dirty fixtures must
 * exit non-zero naming an expected rule — otherwise an emptied rule set passes
 * every check, which is exactly what a one-sided suite lets through.
 */

/* eslint no-console: "off" -- a test runner reports through stdout/stderr */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const PKG = '@ivuorinen/stylelint-config'
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'))
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelint-config-smoke-'))
const keep = process.env.KEEP_FIXTURE === '1'

// Test against the stylelint the package actually declares support for, never a
// bare `stylelint` — that resolves to the `latest` dist-tag, so a new major
// would silently change what "tested" means.
const stylelintRange =
  manifest.peerDependencies?.stylelint ??
  manifest.devDependencies?.stylelint ??
  manifest.dependencies?.stylelint

assert.ok(stylelintRange, 'package.json declares no stylelint version to test against')

const CLEAN_CSS = '.a-b {\n  color: #fff;\n}\n'
const CLEAN_SCSS = '$c: #fff;\n\n.a-b {\n  color: $c;\n}\n'
// #id-sel violates selector-max-id: 0; `red` violates color-named: never.
const DIRTY_CSS = '#id-sel {\n  color: red;\n}\n'
// $BadName violates scss/dollar-variable-pattern.
const DIRTY_SCSS = '$BadName: #fff;\n\n.a-b {\n  color: $BadName;\n}\n'

const cases = [
  { clean: 'clean.css', dirty: 'dirty.css', extend: PKG, rule: 'selector-max-id' },
  { clean: 'clean.css', dirty: 'dirty.css', extend: `${PKG}/css`, rule: 'selector-max-id' },
  { clean: 'clean.scss', dirty: 'dirty.scss', extend: `${PKG}/scss`, rule: 'scss/dollar-variable-pattern' }
]

const run = (cmd, args, cwd = fixture) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

const resolveFrom = (specifier) =>
  run(process.execPath, ['-p', `require.resolve(${JSON.stringify(specifier)})`]).trim()

let failures = 0

const check = (fn) => {
  try {
    fn()

    return true
  } catch (error) {
    failures += 1
    console.error(`✖ ${error.message}`)

    return false
  }
}

const rcJson = path.join(fixture, '.stylelintrc.json')
const rcMjs = path.join(fixture, 'stylelint.config.mjs')

// The two ways a consumer names the config: a string stylelint resolves itself
// (the `require` condition) and an object they imported (the `import` condition).
const forms = {
  'extends string'(extend) {
    fs.rmSync(rcMjs, { force: true })
    fs.writeFileSync(rcJson, JSON.stringify({ extends: [extend] }))
  },
  'imported object'(extend) {
    fs.rmSync(rcJson, { force: true })
    fs.writeFileSync(rcMjs, `import config from '${extend}'\nexport default config\n`)
  }
}

const postinstallScript = () => path.join(fixture, 'node_modules', PKG, 'scripts', 'postinstall.cjs')

const runPostinstall = (env) =>
  spawnSync(process.execPath, [postinstallScript()], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  })

try {
  const tarball = run('npm', ['pack', '--pack-destination', fixture], repo).trim().split('\n').pop()

  // The fixture declares the package directly, which is what postinstall checks
  // before it writes anything.
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true }, null, 2)}\n`
  )
  fs.writeFileSync(path.join(fixture, 'clean.css'), CLEAN_CSS)
  fs.writeFileSync(path.join(fixture, 'clean.scss'), CLEAN_SCSS)
  fs.writeFileSync(path.join(fixture, 'dirty.css'), DIRTY_CSS)
  fs.writeFileSync(path.join(fixture, 'dirty.scss'), DIRTY_SCSS)

  run('npm', [
    'install',
    '--no-audit',
    '--no-fund',
    '--save-dev',
    `stylelint@${stylelintRange}`,
    path.join(fixture, tarball)
  ])

  // stylelint must be declared as a peer, not a dependency. Asserted on the
  // packed manifest because copy-counting alone cannot catch this: when the
  // consumer's stylelint happens to satisfy both ranges npm dedupes to a single
  // copy, and the duplicate only appears once the versions diverge.
  check(() => {
    const packed = JSON.parse(
      fs.readFileSync(path.join(fixture, 'node_modules', PKG, 'package.json'), 'utf8')
    )
    assert.ok(
      packed.peerDependencies?.stylelint,
      'stylelint must be declared in peerDependencies so version mismatches surface at install time'
    )
    assert.ok(
      !packed.dependencies?.stylelint,
      'stylelint must not be in dependencies — that installs a second copy and silences peer checks'
    )
  })

  // The consequence check: whatever the declaration says, the consumer tree must
  // end up with exactly one stylelint.
  check(() => {
    const copies = run(process.execPath, [
      '-e',
      `const fs=require('node:fs'),p=require('node:path');
       const found=[];
       (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
         if(!e.isDirectory())continue;
         const full=p.join(d,e.name);
         if(e.name==='stylelint'&&fs.existsSync(p.join(full,'package.json')))found.push(full);
         if(e.name!=='types')walk(full);
       }})('node_modules');
       console.log(found.join('\\n'))`
    ]).trim()

    assert.strictEqual(
      copies.split('\n').filter(Boolean).length,
      1,
      `expected exactly one stylelint in the consumer tree, found:\n${copies}`
    )
  })

  // postinstall must emit a specifier that resolves to the css config. Invoked
  // directly rather than relying on npm's install-script policy.
  check(() => {
    fs.rmSync(rcJson, { force: true })
    const result = runPostinstall({ INIT_CWD: fixture })
    assert.strictEqual(result.status, 0, `postinstall exited ${result.status}\n${result.stderr}`)
    assert.ok(fs.existsSync(rcJson), `postinstall did not write .stylelintrc.json\n${result.stdout}`)
    const emitted = JSON.parse(fs.readFileSync(rcJson, 'utf8')).extends
    assert.ok(
      [emitted].flat().every((s) => cases.some((c) => c.extend === s)),
      `postinstall emitted an untested specifier: ${JSON.stringify(emitted)}`
    )
  })

  // Re-running must leave an existing config untouched. In practice
  // config-checker detects the file first and returns before the write is
  // reached; the create-exclusive 'wx' flag is the backstop for the race where
  // another process creates it after that check. This asserts the outcome both
  // paths must produce.
  check(() => {
    const sentinel = '{ "extends": ["@ivuorinen/stylelint-config/scss"] }\n'
    fs.writeFileSync(rcJson, sentinel)
    const result = runPostinstall({ INIT_CWD: fixture })
    assert.strictEqual(result.status, 0, `postinstall exited ${result.status}\n${result.stderr}`)
    assert.strictEqual(
      fs.readFileSync(rcJson, 'utf8'),
      sentinel,
      'postinstall overwrote an existing .stylelintrc.json'
    )
  })

  // A missing INIT_CWD must skip cleanly, never abort the consumer's install.
  // This asserts the requirement, not one particular guard — any code path that
  // exits 0 without a stack trace satisfies it.
  check(() => {
    const env = { ...process.env }
    delete env.INIT_CWD
    const result = spawnSync(process.execPath, [postinstallScript()], {
      cwd: fixture,
      encoding: 'utf8',
      env
    })
    assert.strictEqual(result.status, 0, `postinstall crashed without INIT_CWD:\n${result.stderr}`)
  })

  // On a transitive install the package must not write into a project that
  // never asked for it.
  check(() => {
    const transitive = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelint-config-transitive-'))

    try {
      fs.writeFileSync(
        path.join(transitive, 'package.json'),
        `${JSON.stringify({ name: 'unrelated', private: true, devDependencies: { something: '^1.0.0' } }, null, 2)}\n`
      )
      const result = runPostinstall({ INIT_CWD: transitive })
      assert.strictEqual(result.status, 0, `postinstall exited ${result.status}\n${result.stderr}`)
      assert.ok(
        !fs.existsSync(path.join(transitive, '.stylelintrc.json')),
        'postinstall wrote a config into a project that does not depend on it'
      )
    } finally {
      fs.rmSync(transitive, { recursive: true, force: true })
    }
  })

  // ./css and ./scss must not be the same file; root must equal ./css.
  check(() => {
    assert.strictEqual(resolveFrom(PKG), resolveFrom(`${PKG}/css`), 'root and /css should be the css config')
    assert.notStrictEqual(
      resolveFrom(`${PKG}/css`),
      resolveFrom(`${PKG}/scss`),
      '/css and /scss resolve to the same file'
    )
  })

  const bin = path.join(fixture, 'node_modules', '.bin', 'stylelint')

  const lint = (file) => {
    const result = spawnSync(bin, [file], { cwd: fixture, encoding: 'utf8' })

    return { status: result.status, output: `${result.stdout}${result.stderr}` }
  }

  for (const { clean, dirty, extend, rule } of cases) {
    for (const [form, write] of Object.entries(forms)) {
      write(extend)
      const label = `${extend} (${form})`

      const passed = check(() => {
        const ok = lint(clean)
        assert.ok(!ok.output.includes('Unknown rule'), `${label} on ${clean}: unknown rules\n${ok.output}`)
        assert.strictEqual(ok.status, 0, `${label} on ${clean}: exit ${ok.status}\n${ok.output}`)

        // The other half: enforcement must actually happen. Exit 0 here would
        // mean the rule set is empty or the wrong config got resolved.
        const bad = lint(dirty)
        assert.ok(!bad.output.includes('Unknown rule'), `${label} on ${dirty}: unknown rules\n${bad.output}`)
        assert.notStrictEqual(
          bad.status,
          0,
          `${label} on ${dirty}: expected a violation, got exit 0 — the rule set may be empty\n${bad.output}`
        )
        assert.ok(bad.output.includes(rule), `${label} on ${dirty}: expected ${rule} to fire\n${bad.output}`)
      })

      if (passed) console.log(`✔ ${label} — ${clean} clean, ${dirty} rejected by ${rule}`)
    }
  }
} finally {
  if (keep) console.log(`fixture kept at ${fixture}`)
  else fs.rmSync(fixture, { recursive: true, force: true })
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}

console.log('\nAll specifiers resolve, lint clean, and enforce their rules.')
