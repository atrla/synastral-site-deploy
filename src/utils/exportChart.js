// WP-1.5: export fidelity engine.
//
// Product intent: the free download is deliberately screen-grade 1x PNG
// only — the gallery-grade Etsy poster is the print product. Do not add
// resolution or format options here.

const HAMBURG_FONT_URL = `${import.meta.env.BASE_URL}assets/HamburgSymbols.ttf`
const HAMBURG_FONT_FAMILY = 'HamburgSymbols'

const LIGHT_BACKGROUND = '#f8f4e9'

const ATTRIBUTION_TEXT = 'synastral.com'
const ATTRIBUTION_FONT_STACK = 'ui-monospace, SFMono-Regular, "DM Mono", Menlo, Consolas, monospace'
const ATTRIBUTION_FONT_SIZE = 10
const ATTRIBUTION_ALPHA = 0.65
const ATTRIBUTION_BAND_RATIO = 0.04

// Class-name lookups are intentionally scoped to the classes known today
// (`.planets-group` / `.aspects-group` / `.planet-label` / `.planet-glyph` /
// `.aspect-line` / `.house-line`). The API's render path is queueing more
// classes (`element-tint` / `aspect-mark`) that aren't shipped yet — these
// selectors match on class presence, not an exhaustive class list, so they
// keep working once those ship without needing an update here.

/**
 * Removes hidden-group nodes from an (already cloned) SVG based on visual
 * settings. Mutates and returns the passed-in node.
 */
export function pruneHiddenGroups(svgNode, visualSettings = {}) {
  if (!svgNode) return svgNode

  if (!visualSettings.show_placements) {
    svgNode.querySelectorAll('.planets-group').forEach((node) => node.remove())
  }
  if (!visualSettings.show_aspects) {
    svgNode.querySelectorAll('.aspects-group').forEach((node) => node.remove())
  }

  return svgNode
}

/**
 * Inlines the wrapper-CSS equivalents (font-size / stroke-width /
 * stroke-linecap) directly onto matching nodes, since a standalone
 * serialised SVG has no access to the page's external `.chart-output`
 * rules. Mutates and returns the passed-in node.
 */
export function applyInlineStyles(svgNode, visualSettings = {}) {
  if (!svgNode) return svgNode

  svgNode.querySelectorAll('.planet-label').forEach((node) => {
    node.style.fontSize = `${visualSettings.font_size}px`
  })

  svgNode.querySelectorAll('.planet-glyph').forEach((node) => {
    node.style.fontSize = `${visualSettings.glyph_size}px`
  })

  svgNode.querySelectorAll('.aspect-line, .house-line').forEach((node) => {
    node.style.strokeWidth = `${visualSettings.line_width}px`
    node.style.strokeLinecap = 'round'
  })

  return svgNode
}

/**
 * Builds the `<style>@font-face…</style>` element embedding the
 * HamburgSymbols glyph font as a data URI. A rasterised `<img>`/canvas
 * pipeline can't fetch external resources, so page-level @font-face does
 * not apply inside the export — without this, exported glyphs silently
 * fall back to a system font.
 */
export function buildFontFaceStyleElement(doc, base64Font) {
  const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `@font-face{font-family:'${HAMBURG_FONT_FAMILY}';src:url(data:font/ttf;base64,${base64Font});}`
  return style
}

/**
 * Inserts the font-face style as the clone's first child. Mutates and
 * returns the passed-in node.
 */
export function embedFont(svgNode, base64Font) {
  if (!svgNode) return svgNode
  const doc = svgNode.ownerDocument || document
  const style = buildFontFaceStyleElement(doc, base64Font)
  svgNode.insertBefore(style, svgNode.firstChild)
  return svgNode
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

let fontBase64Promise = null

/** Fetches + base64-encodes the glyph font once, caching the in-flight/resolved promise. */
export function fetchFontBase64() {
  if (!fontBase64Promise) {
    fontBase64Promise = fetch(HAMBURG_FONT_URL)
      .then((response) => response.arrayBuffer())
      .then((buffer) => arrayBufferToBase64(buffer))
      .catch((error) => {
        fontBase64Promise = null
        throw error
      })
  }
  return fontBase64Promise
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0')
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Pure: the extended canvas size, with a ~4% bottom band for attribution. */
export function computeExportDimensions(baseWidth, baseHeight) {
  const width = Math.max(1, Math.round(baseWidth))
  const chartHeight = Math.max(1, Math.round(baseHeight))
  const bandHeight = Math.max(1, Math.round(chartHeight * ATTRIBUTION_BAND_RATIO))
  return { width, chartHeight, bandHeight, height: chartHeight + bandHeight }
}

/** Pure: the attribution text's drawing style, derived from the wheel's ink colour. */
export function getAttributionStyle(wheelConfig = {}) {
  return {
    text: ATTRIBUTION_TEXT,
    fontFamily: ATTRIBUTION_FONT_STACK,
    fontSize: ATTRIBUTION_FONT_SIZE,
    color: hexToRgba(wheelConfig.ink, ATTRIBUTION_ALPHA),
  }
}

/** Draws the "synastral.com" attribution centred in the bottom band. Never shown in the on-page preview. */
export function drawAttribution(ctx, dimensions, wheelConfig) {
  const { width, height, bandHeight } = dimensions
  const style = getAttributionStyle(wheelConfig)

  ctx.fillStyle = style.color
  ctx.font = `${style.fontSize}px ${style.fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(style.text, width / 2, height - bandHeight / 2)
}

function downloadPngBlob(blob, fileStem) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `${fileStem}.png`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

/**
 * Renders the current chart SVG (with wrapper-CSS fidelity restored) to a
 * 1x screen-grade PNG and triggers a download. Free-tier export only —
 * no resolution/format switches by design.
 */
export async function exportChart({ svgElement, visualSettings, wheelConfig, fileStem }) {
  if (!svgElement) return

  const clone = svgElement.cloneNode(true)
  pruneHiddenGroups(clone, visualSettings)
  applyInlineStyles(clone, visualSettings)

  const base64Font = await fetchFontBase64()
  embedFont(clone, base64Font)

  const viewBox = svgElement.viewBox?.baseVal
  const baseWidth = viewBox?.width || svgElement.clientWidth || 1024
  const baseHeight = viewBox?.height || svgElement.clientHeight || 1024

  const serialized = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const svgObjectUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = 'async'

    const imageLoaded = new Promise((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = reject
    })
    image.src = svgObjectUrl
    await imageLoaded

    const dimensions = computeExportDimensions(baseWidth, baseHeight)
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isLight = visualSettings.background === 'light'
    if (isLight) {
      ctx.fillStyle = LIGHT_BACKGROUND
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    }

    if (visualSettings.theme === 'bw') {
      ctx.filter = 'grayscale(1)'
    }
    ctx.drawImage(image, 0, 0, dimensions.width, dimensions.chartHeight)
    ctx.filter = 'none'

    drawAttribution(ctx, dimensions, wheelConfig)

    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (pngBlob) downloadPngBlob(pngBlob, fileStem)
  } finally {
    URL.revokeObjectURL(svgObjectUrl)
  }
}
