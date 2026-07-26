'use strict'

/* eslint no-console: "off", n/no-process-exit: "off", no-undefined: "off" -- CLI app that gives users feedback */

const fs = require('node:fs')
const path = require('node:path')
// noinspection NpmUsedModulesInstalled
const process = require('node:process')
const checkConfig = require('@ivuorinen/config-checker')

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

if (process.env.IVUORINEN_STYLELINT_NO_POSTINSTALL) {
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

const foundConfig = checkConfig('stylelint')

if (foundConfig.length > 0) {
  log('Found existing stylelint config file, skipping creation.')
  log('If you want to create a new config file, please remove the existing one.')
  log(`Found config files at: ${foundConfig.join(', ')}`)
  process.exit(0)
}

const filePath = path.join(initCwd, '.stylelintrc.json')
const contents = `${JSON.stringify({ extends: [`${PKG}/css`] }, undefined, 2)}\n`

// Create-exclusive rather than existsSync-then-write: the 'wx' flag makes
// "does it exist?" and "write it" one atomic syscall, so a concurrent install
// cannot slip in between the two and get its config overwritten.
try {
  fs.writeFileSync(filePath, contents, { flag: 'wx' })
  log(`wrote ${filePath}`)
} catch (error) {
  if (error.code === 'EEXIST') {
    log(`${filePath} already exists, leaving it alone.`)
    process.exit(0)
  }

  // Still never a reason to fail the install -- report and move on.
  log(`could not write ${filePath}: ${error.message}`)
  process.exit(0)
}
