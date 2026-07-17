import { describe, expect, it } from 'vitest'
import { sanitizeChartSvg } from './sanitizeSvg.js'

// Fixture approximating a real chart-api response: legitimate drawing
// primitives plus a couple of injected attack vectors.
const CHART_SVG_FIXTURE = `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <script>alert('pwned')</script>
  <g class="planets-group">
    <circle cx="300" cy="300" r="4" fill="#173626" onload="alert(1)" />
    <path d="M300 100 L320 140 L280 140 Z" stroke="#0A3323" />
  </g>
  <image href="x" onerror="alert(2)" />
</svg>`

describe('sanitizeChartSvg', () => {
  it('preserves legitimate chart drawing primitives', () => {
    const clean = sanitizeChartSvg(CHART_SVG_FIXTURE)
    expect(clean).toContain('<circle')
    expect(clean).toContain('<path')
    expect(clean).toContain('class="planets-group"')
    expect(clean).toContain('<g')
  })

  it('strips <script> tags', () => {
    const clean = sanitizeChartSvg(CHART_SVG_FIXTURE)
    expect(clean).not.toContain('<script')
    expect(clean).not.toContain('alert(\'pwned\')')
  })

  it('strips on* event handler attributes', () => {
    const clean = sanitizeChartSvg(CHART_SVG_FIXTURE)
    expect(clean).not.toMatch(/onload\s*=/i)
    expect(clean).not.toMatch(/onerror\s*=/i)
  })

  it('returns an empty string for falsy input', () => {
    expect(sanitizeChartSvg('')).toBe('')
    expect(sanitizeChartSvg(undefined)).toBe('')
    expect(sanitizeChartSvg(null)).toBe('')
  })
})
