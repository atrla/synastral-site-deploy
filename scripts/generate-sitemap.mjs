// scripts/generate-sitemap.mjs — WP10
//
// Generates public/sitemap.xml with a fresh <lastmod> date (today, in
// UTC, YYYY-MM-DD) before `vite build` runs. Vite copies everything in
// public/ into dist/ verbatim during the build, so this script must run
// as an earlier step in the `build` npm script (see package.json) — not
// after prerender.mjs, which only touches dist/index.html.
//
// Synastral is currently a single static page (https://synastral.com/),
// so the sitemap has exactly one <url> entry. If more crawlable pages are
// added later, add more <url> blocks here.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml')

const lastmod = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://synastral.com/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`

writeFileSync(outPath, xml, 'utf8')
console.log(`[generate-sitemap] wrote ${outPath} (lastmod=${lastmod})`)
