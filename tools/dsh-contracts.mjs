/**
 * Materialize the DSH 0.2.0-rc.2 contract packages (downloaded as .tgz) into the
 * plugin's node_modules so `tsc --noEmit` typechecks against the REAL host
 * contracts instead of the phantom 0.1.x-era declarations.
 *
 * Usage:
 *   node tools/dsh-contracts.mjs [--dir <pluginRoot>] [--src <tgzDir>...]
 *
 * The script is idempotent: a package whose node_modules directory already
 * contains a package.json is left alone unless --force is passed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(here, '..')

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const srcDirs = []
let dir = pluginRoot
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dir') dir = path.resolve(argv[++i])
  else if (argv[i] === '--src') srcDirs.push(path.resolve(argv[++i]))
}
if (srcDirs.length === 0) srcDirs.push(path.join(pluginRoot, '.dsh-upgrade-audit', 'contracts'))

const tarballs = []
for (const d of srcDirs) {
  if (!fs.existsSync(d)) continue
  for (const name of fs.readdirSync(d)) {
    if (name.endsWith('.tgz')) tarballs.push(path.join(d, name))
  }
}
if (tarballs.length === 0) {
  console.error(`no contract tarballs found in: ${srcDirs.join(', ')}`)
  console.error('run: npm pack @deepseek-ai/dsh-settings@0.2.0-rc.2 (etc.) into that directory first')
  process.exit(1)
}

const staging = path.join(pluginRoot, '.dsh-upgrade-audit', 'contracts-staging')
fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })

/**
 * Copy a package tree into node_modules.
 *
 * `npm install --no-save` prunes every package that is not in the lock tree, so
 * these packages must be re-placed after any npm run — that is what this script
 * is for. A plain recursive copy is used because it works regardless of volume
 * layout and of npm's hoisting decisions.
 */
function placePackage(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, force: true })
}

let installed = 0
let skipped = 0
const seen = new Set()

for (const tgz of tarballs) {
  const work = path.join(staging, path.basename(tgz, '.tgz'))
  fs.mkdirSync(work, { recursive: true })
  execFileSync('tar', ['-xzf', tgz, '-C', work], { stdio: 'pipe' })
  const pkgDir = path.join(work, 'package')
  const manifestPath = path.join(pkgDir, 'package.json')
  if (!fs.existsSync(manifestPath)) { console.warn(`skip (no package.json): ${path.basename(tgz)}`); continue }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const name = manifest.name
  const version = manifest.version
  if (seen.has(name)) { skipped++; continue }
  seen.add(name)

  const dest = path.join(dir, 'node_modules', ...name.split('/'))
  const existing = path.join(dest, 'package.json')
  if (fs.existsSync(existing) && !force) {
    const current = JSON.parse(fs.readFileSync(existing, 'utf8'))
    console.log(`keep   ${name}@${current.version} (already present)`)
    skipped++
    continue
  }
  placePackage(pkgDir, dest)
  console.log(`install ${name}@${version}`)
  installed++
}

fs.rmSync(staging, { recursive: true, force: true })
console.log(`\n${installed} installed, ${skipped} skipped -> ${path.join(dir, 'node_modules')}`)
