import { useCallback } from 'react'
import { sanitizeChartSvg } from '../utils/sanitizeSvg.js'
import { track } from '../utils/track.js'

const API_BASE = (import.meta.env.VITE_CHART_API_BASE || '').trim()

function buildApiUrl(path) {
  const normalizedPath = path.replace(/^\/+/, '')
  if (!API_BASE) return `/${normalizedPath}`
  return `${API_BASE.replace(/\/+$/, '')}/${normalizedPath}`
}

// Owns every fetch against the chart-api. This is the one place that touches
// `payload.svg` — it's sanitised here, once, at receipt, before any caller
// can hand it to a component for dangerouslySetInnerHTML (ChartView.jsx,
// Hero.jsx print preview).
export function useChartApi() {
  const generateChart = useCallback(async (body) => {
    const response = await fetch(buildApiUrl('api/chart/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.status === 429) {
      track('chart_error', { error_class: 'rate_limited' })
      return { status: 'rate-limited' }
    }

    const payload = await response.json()
    if (!response.ok) {
      track('chart_error', { error_class: 'api_error' })
      return { status: 'error', message: payload.detail || 'couldn\'t generate chart — check your inputs' }
    }

    // The real chart-api response is `{ chart_data, svg }`. Sanitise the svg
    // once, right here at the network boundary, so every consumer downstream
    // is already working with safe markup.
    track('chart_generated')
    return {
      status: 'ok',
      svg: sanitizeChartSvg(payload.svg || ''),
      chartData: payload.chart_data || null,
    }
  }, [])

  const fetchPlaceOptions = useCallback(async (query) => {
    const response = await fetch(`${buildApiUrl('api/chart/places')}?q=${encodeURIComponent(query)}`)
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }, [])

  return { generateChart, fetchPlaceOptions }
}
