import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ETSY_POSTER_URL, ETSY_URL, KOFI_URL, TIKTOK_URL } from '../src/config/site.js'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const distIndex = path.join(distDir, 'index.html')
const distLlms = path.join(distDir, 'llms.txt')

const TARGET_HOSTS = new Set(['ko-fi.com', 'etsy.com', 'tiktok.com'])

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '')
}

function stripTrailingPunctuation(url) {
  return url.replace(/[),.;:]+$/g, '')
}

function isTargetExternalUrl(value) {
  try {
    const parsed = new URL(value)
    const host = normalizeHost(parsed.hostname)
    return TARGET_HOSTS.has(host)
  } catch {
    return false
  }
}

function collectUrls(text, sourceName) {
  const found = []
  const matches = text.matchAll(/\bhttps?:\/\/[^\s"'<>]+/gi)
  for (const match of matches) {
    const raw = stripTrailingPunctuation(match[0])
    if (isTargetExternalUrl(raw)) {
      found.push({ url: raw, source: sourceName })
    }
  }
  return found
}

function normalizeComparable(url) {
  const parsed = new URL(url)
  const host = normalizeHost(parsed.hostname)
  let pathname = parsed.pathname || '/'
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '')
  return `${parsed.protocol}//${host}${pathname}${parsed.search}`
}

function isAllowedEtsy(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const host = normalizeHost(parsed.hostname)
  if (host !== 'etsy.com') return false

  const pathname = parsed.pathname.toLowerCase()
  if (pathname === '/shop/synastralco' || pathname.startsWith('/shop/synastralco/')) {
    return true
  }

  const normalizedUrl = normalizeComparable(url)
  const normalizedShop = normalizeComparable(ETSY_URL)
  if (normalizedUrl === normalizedShop) return true

  if (ETSY_POSTER_URL && ETSY_POSTER_URL.trim()) {
    const normalizedPoster = normalizeComparable(ETSY_POSTER_URL.trim())
    if (normalizedUrl === normalizedPoster) return true
  }

  return false
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function validateInternalHrefs(indexHtml) {
  const offenders = []
  const hrefMatches = indexHtml.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)

  for (const match of hrefMatches) {
    const href = (match[2] || '').trim()
    if (!href) continue

    if (href.startsWith('#')) continue
    if (href.startsWith('http://') || href.startsWith('https://')) continue
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue

    if (!href.startsWith('/')) continue
    if (href === '/' || href === '/#' || href.startsWith('/#')) continue

    let parsed
    try {
      parsed = new URL(href, 'https://synastral.com')
    } catch {
      offenders.push({ href, reason: 'Invalid URL format' })
      continue
    }

    const pathname = decodeURIComponent(parsed.pathname)
    if (pathname === '/') continue

    const relativePath = pathname.replace(/^\/+/, '')
    const filePath = path.join(distDir, relativePath)
    const indexPath = path.join(filePath, 'index.html')

    const ok = (await fileExists(filePath)) || (await fileExists(indexPath))
    if (!ok) {
      offenders.push({ href, reason: `No matching file in dist/ for ${pathname}` })
    }
  }

  return offenders
}

let indexHtml
let llmsTxt

try {
  indexHtml = await readFile(distIndex, 'utf-8')
} catch (err) {
  console.error(`[validate-links] Could not read ${distIndex}. Run build first.`)
  console.error(err.message)
  process.exit(1)
}

try {
  llmsTxt = await readFile(distLlms, 'utf-8')
} catch (err) {
  console.error(`[validate-links] Could not read ${distLlms}. Run build first.`)
  console.error(err.message)
  process.exit(1)
}

const extracted = [
  ...collectUrls(indexHtml, 'dist/index.html'),
  ...collectUrls(llmsTxt, 'dist/llms.txt'),
]

const externalOffenders = []
for (const item of extracted) {
  const parsed = new URL(item.url)
  const host = normalizeHost(parsed.hostname)

  if (host === 'ko-fi.com') {
    if (item.url !== KOFI_URL) {
      externalOffenders.push({
        source: item.source,
        url: item.url,
        expected: KOFI_URL,
      })
    }
    continue
  }

  if (host === 'tiktok.com') {
    if (item.url !== TIKTOK_URL) {
      externalOffenders.push({
        source: item.source,
        url: item.url,
        expected: TIKTOK_URL,
      })
    }
    continue
  }

  if (host === 'etsy.com' && !isAllowedEtsy(item.url)) {
    const expected = [ETSY_URL]
    if (ETSY_POSTER_URL && ETSY_POSTER_URL.trim()) expected.push(ETSY_POSTER_URL.trim())
    expected.push('https://etsy.com/shop/synastralco/*')

    externalOffenders.push({
      source: item.source,
      url: item.url,
      expected: expected.join(' OR '),
    })
  }
}

const internalHrefOffenders = await validateInternalHrefs(indexHtml)

if (externalOffenders.length || internalHrefOffenders.length) {
  console.error('[validate-links] FAIL')

  if (externalOffenders.length) {
    console.error(`\n[validate-links] External canonical mismatches (${externalOffenders.length}):`)
    for (const offender of externalOffenders) {
      console.error(`  - ${offender.source}: ${offender.url}`)
      console.error(`    expected: ${offender.expected}`)
    }
  }

  if (internalHrefOffenders.length) {
    console.error(`\n[validate-links] Broken internal href paths (${internalHrefOffenders.length}):`)
    for (const offender of internalHrefOffenders) {
      console.error(`  - ${offender.href}`)
      console.error(`    reason: ${offender.reason}`)
    }
  }

  process.exit(1)
}

console.log(`[validate-links] Checked ${extracted.length} external URL(s) in dist/index.html + dist/llms.txt.`)
console.log('[validate-links] PASS')
