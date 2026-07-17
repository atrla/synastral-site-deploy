// WP-2.3 — consent-gated analytics (Google Consent Mode v2).
//
// UK GDPR/PECR applies (Kate is UK-based; GA4 + Clarity set cookies/
// identifiers), so nothing here fires until the visitor explicitly opts in.
// Every export is a plain function — no DOM work runs at module import
// time — so this module is safe to import from entry-server.jsx's SSR tree
// (App.jsx -> ConsentBanner.jsx) without touching `window`/`document`
// outside of an effect or event handler.
import { CLARITY_PROJECT_ID, GA_MEASUREMENT_ID } from '../config/site.js'

export const CONSENT_STORAGE_KEY = 'synastral-consent'
const GRANTED = 'granted'
const DENIED = 'denied'

// Only analytics_storage is ever flipped to 'granted' — this site has no
// ad platforms wired up, so the ad_* categories stay denied even after the
// visitor opts in. Keeping them denied is the minimal-consent posture.
const DEFAULT_CONSENT_STATE = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
}

let gaScriptInjected = false
let clarityScriptInjected = false

function hasDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() { window.dataLayer.push(arguments) }
  }
}

/** Sets Consent Mode v2 defaults (everything denied). Call once, client-side, as early as possible — before anything else touches gtag. */
export function initConsentDefaults() {
  if (!hasDom()) return
  ensureGtagStub()
  window.gtag('consent', 'default', { ...DEFAULT_CONSENT_STATE, wait_for_update: 500 })
}

/** Reads the persisted choice. Returns 'granted' | 'denied' | null (no choice made yet, or SSR/no localStorage). */
export function getConsent() {
  if (!hasDom()) return null
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored === GRANTED || stored === DENIED ? stored : null
  } catch {
    // localStorage unavailable (private mode, disabled storage, etc.)
    return null
  }
}

function persistConsent(value) {
  if (!hasDom()) return
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
  } catch {
    // Choice still takes effect for this page load — it just won't
    // persist across reloads if localStorage is unavailable.
  }
}

function injectGaScript() {
  if (gaScriptInjected || !GA_MEASUREMENT_ID || !hasDom()) return
  gaScriptInjected = true

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID)

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

function injectClarityScript() {
  if (clarityScriptInjected || !CLARITY_PROJECT_ID || !hasDom()) return
  clarityScriptInjected = true

  // Microsoft's own bootstrap snippet, unchanged bar the id — kept as a
  // function (not an inline <script> in index.html) so it only ever runs
  // after consent, and so the CSP's script-src (no 'unsafe-inline') is
  // never a concern: this is the *tag it injects* that needs to be an
  // allowed origin (www.clarity.ms), not this JS itself.
  ;(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID)
}

/** Visitor opted in: persist, flip analytics_storage to granted, inject GA4 + Clarity (each exactly once per page load). No-ops cleanly if an id is unset. */
export function grantConsent() {
  if (!hasDom()) return
  ensureGtagStub()
  persistConsent(GRANTED)
  window.gtag('consent', 'update', { ...DEFAULT_CONSENT_STATE, analytics_storage: 'granted' })
  injectGaScript()
  injectClarityScript()
}

/** Visitor opted out: persist, keep analytics_storage denied. Never injects anything. */
export function denyConsent() {
  if (!hasDom()) return
  ensureGtagStub()
  persistConsent(DENIED)
  window.gtag('consent', 'update', DEFAULT_CONSENT_STATE)
}
