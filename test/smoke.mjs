/**
 * End-to-end smoke test: packs this repo, installs the tarball into a throwaway
 * fixture, and runs the real stylelint CLI through every published specifier.
 *
 * This has to go through a real install. Importing the config object in-repo
 * exercises none of what actually broke in 1.3.5: a wrong `exports` subpath,
 * an `extends` entry stylelint cannot resolve, and rules stylelint deleted.
 */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const PKG = '@ivuorinen/stylelint-config'
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stylelint-config-smoke-'))
const keep = process.env.KEEP_FIXTURE === '1'

const CSS = '.a-b {\n  color: #fff;\n}\n'
const SCSS = '$c: #fff;\n\n.a-b {\n  color: $c;\n}\n'

const cases = [
  { file: 'a.css', extend: PKG },
  { file: 'a.css', extend: `${PKG}/css` },
  { file: 'a.scss', extend: `${PKG}/scss` }
]

const run = (cmd, args, cwd = fixture) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

const resolveFrom = (specifier) =>
  run(process.execPath, ['-p', `require.resolve(${JSON.stringify(specifier)})`]).trim()

let failures = 0
const check = (fn) => {
  try {
    fn()
  } catch (error) {
    failures += 1
    console.error(`✖ ${error.message}`)
  }
}

try {
  const tarball = run('npm', ['pack', '--pack-destination', fixture], repo).trim().split('\n').pop()

  fs.writeFileSync(path.join(fixture, 'package.json'), '{"name":"fixture","private":true}\n')
  fs.writeFileSync(path.join(fixture, 'a.css'), CSS)
  fs.writeFileSync(path.join(fixture, 'a.scss'), SCSS)
  run('npm', [
    'install',
    '--no-audit',
    '--no-fund',
    '--save-dev',
    'stylelint',
    path.join(fixture, tarball)
  ])

  // postinstall must emit a specifier that actually resolves to the css config.
  // Invoked directly rather than relying on npm's install-script policy.
  check(() => {
    const rc = path.join(fixture, '.stylelintrc.json')
    fs.rmSync(rc, { force: true })
    execFileSync(process.execPath, [path.join(fixture, 'node_modules', PKG, 'scripts', 'postinstall.cjs')], {
      cwd: fixture,
      env: { ...process.env, INIT_CWD: fixture },
      stdio: ['ignore', 'ignore', 'inherit']
    })
    assert.ok(fs.existsSync(rc), 'postinstall did not write .stylelintrc.json')
    const emitted = JSON.parse(fs.readFileSync(rc, 'utf8')).extends
    assert.ok(
      [emitted].flat().every((s) => cases.some((c) => c.extend === s)),
      `postinstall emitted an untested specifier: ${JSON.stringify(emitted)}`
    )
  })

  // Bug 1: ./css and ./scss must not be the same file
  check(() => {
    assert.equal(resolveFrom(PKG), resolveFrom(`${PKG}/css`), 'root and /css should be the css config')
    assert.notEqual(
      resolveFrom(`${PKG}/css`),
      resolveFrom(`${PKG}/scss`),
      '/css and /scss resolve to the same file'
    )
  })

  // Bugs 2 + 3: every specifier must lint clean through the real CLI, both as a
  // string in `extends` (the `require` condition) and as an imported object
  // (the `import` condition, i.e. what a stylelint.config.mjs consumer does).
  const bin = path.join(fixture, 'node_modules', '.bin', 'stylelint')
  const rcJson = path.join(fixture, '.stylelintrc.json')
  const rcMjs = path.join(fixture, 'stylelint.config.mjs')

  const forms = {
    'extends string': (extend) => {
      fs.rmSync(rcMjs, { force: true })
      fs.writeFileSync(rcJson, JSON.stringify({ extends: [extend] }))
    },
    'imported object': (extend) => {
      fs.rmSync(rcJson, { force: true })
      fs.writeFileSync(rcMjs, `import config from '${extend}'\nexport default config\n`)
    }
  }

  for (const { file, extend } of cases) {
    for (const [form, write] of Object.entries(forms)) {
      write(extend)
      const result = spawnSync(bin, [file], { cwd: fixture, encoding: 'utf8' })
      const output = `${result.stdout}${result.stderr}`
      const label = `${extend} → ${file} (${form})`

      check(() => {
        assert.doesNotMatch(output, /Unknown rule/, `${label}: unknown rules\n${output}`)
        assert.equal(result.status, 0, `${label}: exit ${result.status}\n${output}`)
      })

      if (failures === 0) console.log(`✔ ${label}`)
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

console.log('\nAll specifiers lint clean.')
