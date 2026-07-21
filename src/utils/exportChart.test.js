import { describe, expect, it } from 'vitest'
import {
  applyInlineStyles,
  buildFontFaceStyleElement,
  computeExportDimensions,
  embedFont,
  getAttributionStyle,
  pruneHiddenGroups,
} from './exportChart.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

function parseSvg(markup) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  return doc.documentElement
}

const baseVisualSettings = {
  theme: 'ink',
  background: 'white',
  line_width: 1.5,
  glyph_size: 16,
  font_size: 11,
  show_placements: true,
  show_aspects: true,
}

describe('pruneHiddenGroups', () => {
  it('removes .planets-group when show_placements is false', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><g class="planets-group"><text class="planet-label">a</text></g><g class="aspects-group"></g></svg>`)
    pruneHiddenGroups(svg, { ...baseVisualSettings, show_placements: false })
    expect(svg.querySelectorAll('.planets-group')).toHaveLength(0)
    expect(svg.querySelectorAll('.aspects-group')).toHaveLength(1)
  })

  it('removes aspect primitives when show_aspects is false', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><g class="planets-group"></g><g class="aspects-group"><line class="aspect-line"></line><path class="aspect-mark"></path></g></svg>`)
    pruneHiddenGroups(svg, { ...baseVisualSettings, show_aspects: false })
    expect(svg.querySelectorAll('.aspects-group')).toHaveLength(1)
    expect(svg.querySelectorAll('.aspect-line')).toHaveLength(0)
    expect(svg.querySelectorAll('.aspect-mark')).toHaveLength(0)
    expect(svg.querySelectorAll('.planets-group')).toHaveLength(1)
  })

  it('leaves both groups when both settings are true', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><g class="planets-group"></g><g class="aspects-group"></g></svg>`)
    pruneHiddenGroups(svg, baseVisualSettings)
    expect(svg.querySelectorAll('.planets-group')).toHaveLength(1)
    expect(svg.querySelectorAll('.aspects-group')).toHaveLength(1)
  })

  it('matches nodes defensively even when other/unshipped classes are also present', () => {
    // The API's render path is queueing more classes (element-tint / aspect-mark)
    // that aren't shipped yet. A class-presence selector must still match.
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><g class="planets-group element-tint"></g><g class="aspects-group"><g class="aspect-mark"></g></g></svg>`)
    pruneHiddenGroups(svg, { ...baseVisualSettings, show_placements: false, show_aspects: false })
    expect(svg.querySelectorAll('.planets-group')).toHaveLength(0)
    expect(svg.querySelectorAll('.aspects-group')).toHaveLength(1)
    expect(svg.querySelectorAll('.aspect-mark')).toHaveLength(0)
  })
})

describe('applyInlineStyles', () => {
  it('inlines font-size onto .planet-label and .planet-glyph reflecting settings', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><text class="planet-label">a</text><text class="planet-glyph">b</text></svg>`)
    applyInlineStyles(svg, { ...baseVisualSettings, font_size: 13, glyph_size: 20 })
    expect(svg.querySelector('.planet-label').style.fontSize).toBe('13px')
    expect(svg.querySelector('.planet-glyph').style.fontSize).toBe('20px')
  })

  it('inlines stroke-width and rounded stroke-linecap onto .aspect-line and .house-line reflecting settings', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><line class="aspect-line"></line><line class="house-line"></line></svg>`)
    applyInlineStyles(svg, { ...baseVisualSettings, line_width: 2.25 })
    for (const selector of ['.aspect-line', '.house-line']) {
      const node = svg.querySelector(selector)
      expect(node.style.strokeWidth).toBe('2.25px')
      expect(node.style.strokeLinecap).toBe('round')
    }
  })

  it('does not blow up on nodes carrying extra, unshipped classes', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><line class="aspect-mark aspect-line"></line></svg>`)
    applyInlineStyles(svg, { ...baseVisualSettings, line_width: 1 })
    expect(svg.querySelector('.aspect-line').style.strokeWidth).toBe('1px')
  })
})

describe('embedFont / buildFontFaceStyleElement', () => {
  it('builds a @font-face style element embedding the base64 font as HamburgSymbols', () => {
    const doc = parseSvg(`<svg xmlns="${SVG_NS}"></svg>`).ownerDocument
    const style = buildFontFaceStyleElement(doc, 'AAAA')
    expect(style.tagName.toLowerCase()).toBe('style')
    expect(style.textContent).toContain('HamburgSymbols')
    expect(style.textContent).toContain('base64,AAAA')
  })

  it('inserts the font-face style as the clone\'s first child', () => {
    const svg = parseSvg(`<svg xmlns="${SVG_NS}"><g class="planets-group"></g></svg>`)
    embedFont(svg, 'ZZZZ')
    expect(svg.firstChild.tagName.toLowerCase()).toBe('style')
    expect(svg.firstChild.textContent).toContain('HamburgSymbols')
    expect(svg.children[1].getAttribute('class')).toBe('planets-group')
  })
})

describe('computeExportDimensions', () => {
  it('renders at 2x and extends height by a ~4% attribution band', () => {
    const dims = computeExportDimensions(1000, 1000)
    expect(dims.width).toBe(2000)
    expect(dims.chartHeight).toBe(2000)
    expect(dims.bandHeight).toBe(80)
    expect(dims.height).toBe(2080)
  })

  it('rounds fractional viewBox dimensions', () => {
    const dims = computeExportDimensions(500.4, 501.6)
    expect(dims.width).toBe(1001)
    expect(dims.chartHeight).toBe(1003)
    expect(dims.height).toBe(dims.chartHeight + dims.bandHeight)
  })
})

describe('getAttributionStyle (attribution present in the export path)', () => {
  it('uses the "synastral.com" label', () => {
    expect(getAttributionStyle({ ink: '#0A3323' }).text).toBe('synastral.com')
  })

  it('derives the colour from wheelConfig.ink at 0.65 alpha', () => {
    const style = getAttributionStyle({ ink: '#0A3323' })
    expect(style.color).toBe('rgba(10, 51, 35, 0.65)')
  })

  it('forces monochrome attribution colour for B&W exports', () => {
    const style = getAttributionStyle({ ink: '#0A3323' }, true)
    expect(style.color).toBe('rgba(0, 0, 0, 0.65)')
  })

  it('falls back gracefully when wheelConfig is missing', () => {
    expect(() => getAttributionStyle()).not.toThrow()
  })
})
