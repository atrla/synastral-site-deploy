// scripts/prerender.mjs — WP8 (+ WP6 imagesrcset patch)
//
// Prerenders the app to static HTML and splices it into dist/index.html
// after `vite build`. This is the alternative to a headless-browser
// prerender (puppeteer/playwright): both are blocked by this sandbox's
// network allowlist (chromium download returns 403), so instead we use
// react-dom/server's renderToString in a plain Node build step. This is a
// standard, supported prerendering technique for React apps and has no
// browser dependency at all.
//
// Steps:
//   1. Use Vite's build API to bundle src/entry-server.jsx as an SSR
//      (Node-target) module — this gives us JSX transform, path aliases,
//      etc. "for free" via the project's own vite.config.js, and Vite
//      automatically treats CSS imports as no-ops in SSR builds so the
//      component tree's `import '../styles/x.css'` statements don't need
//      any special handling here.
//   2. Import the built SSR bundle and call its `render()` export, which
//      calls renderToString(<App />).
//   3. Read the already-built dist/index.html (produced by `vite build`,
//      which has the real hashed <script>/<link> tags for the client
//      bundle), patch the hero preload link's `imagesrcset` (see WP6 note
//      below), and replace the empty `<div id="root"></div>` with the
//      prerendered markup.
//   4. Clean up the throwaway SSR bundle directory.
//
// WP6 note — why the imagesrcset patch exists:
//   index.html's <link rel="preload" as="image"> points its `href` at
//   /src/assets/03-chart-wheel-640.webp so Vite's HTML asset pipeline
//   content-hashes it (same hashed file the Hero.jsx `?url` import
//   produces) — that part Vite rewrites automatically. But Vite's HTML
//   plugin only rewrites a fixed allowlist of src/href-style attributes;
//   `imagesrcset` on <link> isn't one of them (verified against installed
//   vite@5.4.21's assetAttrsConfig), so it is left as the literal
//   /src/assets/... source paths, which don't exist in the deployed
//   dist/ output. We patch it here by finding the real hashed filenames
//   already emitted into dist/assets/ by `vite build`.
//
// Run as part of `npm run build` (see package.json), after `vite build`.

import { build } from 'vite'
import { readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const distIndex = path.join(root, 'dist', 'index.html')

if (!existsSync(distIndex)) {
  console.error('[prerender] dist/index.html not found — run `vite build` first.')
  process.exit(1)
}

// 1. Build the SSR bundle into a scratch directory (outside dist/, so it
//    never ships to the deployed site). This has to live *inside* the
//    project (not os.tmpdir()) — the SSR bundle keeps 'react'/'react-dom'
//    as external `import` specifiers (they're not bundled in), so Node's
//    module resolution needs to walk up from the output file and find this
//    project's node_modules. A system temp dir has no such node_modules
//    above it and resolution fails.
const ssrOutDir = path.join(root, '.ssr-tmp')
// Cleanup is best-effort: some sandboxed/networked filesystems (FUSE
// mounts etc.) support write/overwrite but reject unlink() outright. On
// a normal filesystem this rm() always succeeds silently, same as
// before; where it can't, we log and continue rather than crash the
// build over a scratch-directory cleanup step, since the outputs that
// matter (dist/) are written before this ever runs.
await rm(ssrOutDir, { recursive: true, force: true }).catch((err) => {
  console.warn(`[prerender] could not clear ${ssrOutDir} (continuing): ${err.message}`)
})
await mkdir(ssrOutDir, { recursive: true })

// emptyOutDir: false (Agent B, 2026-07-13) — Vite's own build() call empties
// outDir itself before writing, via an internal rmSync/unlink pass, same as
// the explicit rm() calls above. On a normal filesystem this is a harmless
// no-op (the dir is already empty from the rm() above). On this sandbox,
// where unlink is rejected outright, the rm() above only *attempts* the
// clear (and warns+continues on failure, per the patch below) — so if a
// prior build already left files in ssrOutDir and couldn't remove them,
// this internal emptyDir call used to throw an uncaught EPERM and crash the
// whole build on the very next run, well after dist/ was already correct.
// The scratch bundle only ever contains one fixed-name output file
// (entryFileNames: 'entry-server.mjs' below), so nothing depends on the
// directory being genuinely empty first — overwriting it in place is fine.
// Disabling Vite's own emptyOutDir sidesteps the crash entirely without
// changing what gets written.
await build({
  logLevel: 'warn',
  build: {
    ssr: path.join(root, 'src', 'entry-server.jsx'),
    outDir: ssrOutDir,
    emptyOutDir: false,
    write: true,
    rollupOptions: { output: { format: 'es', entryFileNames: 'entry-server.mjs' } },
  },
})

// 2. Import the built entry and render the app to an HTML string.
const entryUrl = pathToFileURL(path.join(ssrOutDir, 'entry-server.mjs')).href
const { render } = await import(entryUrl)
let appHtml = render()

if (!appHtml || !appHtml.includes('<h1')) {
  console.error('[prerender] renderToString produced unexpected output — aborting splice.')
  console.error(appHtml?.slice(0, 500))
  process.exit(1)
}

// 2b. WP6: the SSR build resolves `import '../assets/x.webp?url'` to a
//     root-absolute "/assets/HASH.webp" path (it doesn't know about this
//     project's `base: './'`, unlike the client bundle, which computes its
//     asset URLs at runtime relative to its own `import.meta.url` and so
//     is base-agnostic). A root-absolute path only works when the site is
//     deployed at a domain root; `base: './'` exists specifically so dist/
//     can be deployed from any subfolder. Rewrite those to the same
//     "./assets/..." relative form the client build and the preload link
//     already use, so the pre-hydration (and no-JS/crawler-visible) markup
//     stays subfolder-portable too. Scoped to appHtml only — it never
//     touches the <head>'s absolute https://synastral.com/assets/og-image
//     URL, which lives outside this string.
appHtml = appHtml.replaceAll('/assets/', './assets/')

// 3. Patch the preload link's `imagesrcset` with the real hashed
//    filenames Vite emitted for the chart-wheel image, then splice the
//    prerendered markup into dist/index.html.
let html = await readFile(distIndex, 'utf-8')

const imagesrcsetRe = /imagesrcset="\/src\/assets\/03-chart-wheel-640\.webp 640w, \/src\/assets\/03-chart-wheel-1280\.webp 1280w"/
if (imagesrcsetRe.test(html)) {
  const distAssetsDir = path.join(root, 'dist', 'assets')
  const assetFiles = await readdir(distAssetsDir)
  const hashed640 = assetFiles.find((f) => /^03-chart-wheel-640-.+\.webp$/.test(f))
  const hashed1280 = assetFiles.find((f) => /^03-chart-wheel-1280-.+\.webp$/.test(f))
  if (!hashed640 || !hashed1280) {
    console.error('[prerender] could not find hashed chart-wheel-640/1280 files in dist/assets/ — aborting imagesrcset patch.')
    process.exit(1)
  }
  html = html.replace(imagesrcsetRe, `imagesrcset="./assets/${hashed640} 640w, ./assets/${hashed1280} 1280w"`)
  console.log(`[prerender] patched preload imagesrcset -> ./assets/${hashed640} 640w, ./assets/${hashed1280} 1280w`)
} else {
  console.warn('[prerender] preload imagesrcset placeholder not found in dist/index.html — skipping patch (markup may have changed).')
}

if (!html.includes('<div id="root"></div>')) {
  console.error('[prerender] could not find empty <div id="root"></div> in dist/index.html — already prerendered, or markup changed.')
  process.exit(1)
}
html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
await writeFile(distIndex, html, 'utf-8')

// 4. Clean up the scratch SSR build (best-effort — see note above; a
//    failure here must not fail the build, dist/ is already complete).
await rm(ssrOutDir, { recursive: true, force: true }).catch((err) => {
  console.warn(`[prerender] could not remove ${ssrOutDir} (continuing): ${err.message}`)
})

console.log(`[prerender] Spliced ${appHtml.length.toLocaleString()} chars of server-rendered markup into dist/index.html`)
