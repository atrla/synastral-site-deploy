// scripts/validate-schema.mjs — WP9
//
// Extracts the JSON-LD <script type="application/ld+json"> block from the
// BUILT dist/index.html (not the source index.html) and validates it:
//   1. It parses as JSON.
//   2. Every @type used is a real, known schema.org type (no typos, no
//      made-up types).
//   3. None of the deprecated/excluded types (HowTo, FAQPage,
//      AggregateRating, LocalBusiness) are present anywhere in the graph.
//
// This is a local, offline sanity check — not a full schema.org RDF/SHACL
// validator — but it catches the failure modes that matter for this task:
// malformed JSON, typo'd @type values, and accidentally-included types we
// were told never to add.
//
// Usage: node scripts/validate-schema.mjs  (run after `npm run build`)

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const distIndex = path.join(root, 'dist', 'index.html')

// Known-good schema.org types used (or plausibly usable) by this graph.
// Keep this list narrow and explicit rather than trying to embed the whole
// schema.org vocabulary — we just need to catch typos in the types we
// actually emit.
const KNOWN_TYPES = new Set([
  'WebSite', 'WebPage', 'Organization', 'Person', 'Service',
  'ProfessionalService', 'Product', 'Offer', 'WebApplication',
  'ImageObject', 'PostalAddress', 'ContactPoint',
])

// Deprecated / explicitly excluded for this site per SEO guardrails.
const EXCLUDED_TYPES = new Set(['HowTo', 'FAQPage', 'AggregateRating', 'LocalBusiness'])

function collectTypes(node, acc) {
  if (Array.isArray(node)) {
    for (const n of node) collectTypes(n, acc)
    return
  }
  if (node && typeof node === 'object') {
    if (node['@type']) {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
      for (const t of types) acc.add(t)
    }
    for (const key of Object.keys(node)) {
      if (key === '@type') continue
      collectTypes(node[key], acc)
    }
  }
}

let html
try {
  html = await readFile(distIndex, 'utf-8')
} catch (err) {
  console.error(`[validate-schema] Could not read ${distIndex} — run \`npm run build\` first.`)
  console.error(err.message)
  process.exit(1)
}

const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
if (!match) {
  console.error('[validate-schema] FAIL — no <script type="application/ld+json"> block found in dist/index.html')
  process.exit(1)
}

let data
try {
  data = JSON.parse(match[1])
} catch (err) {
  console.error('[validate-schema] FAIL — JSON-LD block is not valid JSON')
  console.error(err.message)
  process.exit(1)
}

const errors = []

if (data['@context'] !== 'https://schema.org') {
  errors.push(`Unexpected @context: ${data['@context']}`)
}

const graph = data['@graph']
if (!Array.isArray(graph) || graph.length === 0) {
  errors.push('No @graph array found (or it is empty)')
}

const typesFound = new Set()
collectTypes(data, typesFound)

for (const t of typesFound) {
  if (EXCLUDED_TYPES.has(t)) {
    errors.push(`Excluded/deprecated type present: ${t}`)
  } else if (!KNOWN_TYPES.has(t)) {
    errors.push(`Unrecognized @type (possible typo, not in known schema.org type allowlist): ${t}`)
  }
}

// Every URL in the graph should be absolute.
const urls = []
function collectUrls(node) {
  if (Array.isArray(node)) { node.forEach(collectUrls); return }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'url' || k === '@id' || k === 'sameAs') && typeof v === 'string') urls.push(v)
      else if ((k === 'sameAs') && Array.isArray(v)) v.forEach(u => urls.push(u))
      else collectUrls(v)
    }
  }
}
collectUrls(data)
for (const u of urls) {
  const isAbsolute = /^https?:\/\//.test(u) || /^mailto:/.test(u)
  if (!isAbsolute) errors.push(`Non-absolute URL found: ${u}`)
}

console.log(`[validate-schema] Found @graph with ${graph?.length ?? 0} node(s).`)
console.log(`[validate-schema] @type values used: ${[...typesFound].sort().join(', ')}`)
console.log(`[validate-schema] URLs checked: ${urls.length}`)

if (errors.length) {
  console.error(`\n[validate-schema] FAIL — ${errors.length} issue(s):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log('\n[validate-schema] PASS — JSON-LD is valid JSON, all @type values are recognized schema.org types, no deprecated/excluded types present, all URLs absolute.')
