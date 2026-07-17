import DOMPurify from 'dompurify'

// Chart SVG markup comes straight from the chart-api response and is injected
// via dangerouslySetInnerHTML (ChartView.jsx, Hero.jsx print preview) — so it
// has to be sanitised once, here, at the point it enters the app. The `svg`
// + `svgFilters` DOMPurify profiles keep drawing primitives (circle, path,
// g, text, use, defs, filter primitives, etc.) while stripping anything
// script-capable: <script>, on*= handlers, foreignObject, javascript: URLs.
//
// Note: DOMPurify needs a real `window` to sanitise (its module eval is
// DOM-free, but `.sanitize()` is not) — this must only be called client-side,
// never during SSR/prerender.
export function sanitizeChartSvg(svg) {
  if (!svg) return ''
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
}
