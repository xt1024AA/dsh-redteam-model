import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || process.cwd()
const SKIP = new Set(['node_modules', '.git', 'lib', 'assets', '功能展示', 'payload-src', 'dist'])
const EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.ets'])

const importRe = /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g
const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

const files = []
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP.has(e.name)) continue
      walk(path.join(dir, e.name))
    } else if (EXT.has(path.extname(e.name))) {
      files.push(path.join(dir, e.name))
    }
  }
}
walk(ROOT)

// package.json map: dir -> manifest
const manifests = new Map()
function findManifests(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue
      findManifests(path.join(dir, e.name))
    } else if (e.name === 'package.json') {
      const p = path.join(dir, e.name)
      try { manifests.set(path.dirname(p), JSON.parse(fs.readFileSync(p, 'utf8'))) } catch {}
    }
  }
}
findManifests(ROOT)

const byEntry = new Map()
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  const specs = new Set()
  for (const m of src.matchAll(importRe)) specs.add(m[1])
  for (const m of src.matchAll(dynamicRe)) specs.add(m[1])
  const depth = path.relative(ROOT, file).split(path.sep).length - 1
  // nearest manifest = the package boundary this file belongs to
  let dir = path.dirname(file)
  let owner = null
  for (let i = 0; i <= depth + 1; i++) {
    if (manifests.has(dir)) { owner = dir; break }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const ownerRel = owner ? (path.relative(ROOT, owner) || '.') : '.'
  if (!byEntry.has(ownerRel)) byEntry.set(ownerRel, { files: 0, specs: new Map() })
  const rec = byEntry.get(ownerRel)
  rec.files++
  for (const s of specs) {
    if (s.startsWith('.') || s.startsWith('/') || s.startsWith('node:')) continue
    if (!rec.specs.has(s)) rec.specs.set(s, [])
    rec.specs.get(s).push(path.relative(ROOT, file))
  }
}

const result = {}
for (const [entry, rec] of [...byEntry].sort()) {
  const pkg = manifests.get(path.join(ROOT, entry)) || {}
  const declared = {
    ...(pkg.dependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  }
  const rows = []
  for (const [spec, users] of [...rec.specs].sort()) {
    const base = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
    const at = declared[base] ?? declared[spec] ?? null
    rows.push({ spec, base, declared: at, fileCount: users.length, sample: users.slice(0, 2), undeclared: at === null })
  }
  result[entry] = {
    packageName: pkg.name ?? null,
    version: pkg.version ?? null,
    fileCount: rec.files,
    dshImports: rows.filter(r => r.base.startsWith('@deepseek-ai/')),
    otherImports: rows.filter(r => !r.base.startsWith('@deepseek-ai/')),
    undeclaredDsh: rows.filter(r => r.undeclared && r.base.startsWith('@deepseek-ai/')).length,
  }
}

fs.writeFileSync(path.join(ROOT, '.dsh-upgrade-audit', 'dep-inventory.json'), JSON.stringify(result, null, 2))
console.log(`scanned ${files.length} source files across ${Object.keys(result).length} package boundaries`)
console.log('wrote .dsh-upgrade-audit/dep-inventory.json')
