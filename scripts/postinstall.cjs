'use strict'

/* eslint no-console: "off", n/no-process-exit: "off", no-undefined: "off" -- CLI app that gives users feedback */

const fs = require('node:fs')
const path = require('node:path')
// noinspection NpmUsedModulesInstalled
const process = require('node:process')
const { writeStarterConfig } = require('@ivuorinen/config-checker')

const PKG = '@ivuorinen/stylelint-config'
const log = (message) => console.log(`stylelint-config: ${message}`)

// Writing a starter config is a convenience, never a reason to fail an install.
// Every path below exits 0 and says why.

// INIT_CWD is an npm/yarn convention, not a guarantee. Without it we have no
// idea which directory the user installed from, so there is nothing to do.
const initCwd = process.env.INIT_CWD

if (!initCwd) {
  log('INIT_CWD is not set, skipping config creation.')
  process.exit(0)
}

// Compare the value, not mere presence: environment variables are strings, so
// a truthiness check would treat "0" and "false" as a request to skip.
if (/^(?:1|true|yes)$/iu.test(process.env.IVUORINEN_STYLELINT_NO_POSTINSTALL ?? '')) {
  log('IVUORINEN_STYLELINT_NO_POSTINSTALL is set, skipping config creation.')
  process.exit(0)
}

// INIT_CWD is the top-level install directory regardless of dependency depth,
// so on a transitive install it points at a project that never asked for this
// config. Only write when someone depends on us directly.
let manifest

try {
  manifest = JSON.parse(fs.readFileSync(path.join(initCwd, 'package.json'), 'utf8'))
} catch {
  log(`no readable package.json in ${initCwd}, skipping config creation.`)
  process.exit(0)
}

const isDirectDependency = Boolean(
  manifest.dependencies?.[PKG] || manifest.devDependencies?.[PKG] || manifest.peerDependencies?.[PKG]
)

if (!isDirectDependency) {
  log(`${PKG} is only a transitive dependency here, skipping config creation.`)
  process.exit(0)
}

// writeStarterConfig never throws: it creates the file with 'wx', so a config a
// concurrent install wrote between the check and the write is reported as
// found rather than overwritten, and a failed write comes back for us to report.
const starterConfig = { extends: [`${PKG}/css`] }
const result = writeStarterConfig(
  'stylelint',
  '.stylelintrc.json',
  JSON.stringify(starterConfig, undefined, 2),
  initCwd
)

if (result.status === 'found') {
  log('Found existing stylelint config file, skipping creation.')
  log('If you want to create a new config file, please remove the existing one.')
  log(`Found config files at: ${result.found.join(', ')}`)
} else if (result.status === 'written') {
  log(`wrote ${result.filePath}`)
} else {
  // Still never a reason to fail the install -- report and move on.
  log(`could not write ${result.filePath}: ${result.error.message}`)
}
