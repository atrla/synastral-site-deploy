// WP-2.3 — thin, no-op-safe event wrapper around gtag.
//
// Every call-site in the app imports `track` rather than touching
// `window.gtag` directly, so instrumentation stays silent (never throws,
// never sends anything) whenever there's no `window` (SSR) or the visitor
// hasn't granted analytics consent yet.
import { getConsent } from './consent.js'

export function track(event, props) {
  if (typeof window === 'undefined') return
  if (getConsent() !== 'granted') return
  window.gtag?.('event', event, props)
}
