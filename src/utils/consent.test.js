import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONSENT_STORAGE_KEY,
  denyConsent,
  getConsent,
  grantConsent,
  initConsentDefaults,
} from './consent.js'

function clearInjectedScripts() {
  document.head.querySelectorAll('script').forEach((node) => node.remove())
}

describe('consent', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearInjectedScripts()
    delete window.gtag
    delete window.dataLayer
  })

  it('reports no stored choice by default', () => {
    expect(getConsent()).toBeNull()
  })

  it('initConsentDefaults sets up the gtag stub and defaults everything to denied', () => {
    initConsentDefaults()
    expect(typeof window.gtag).toBe('function')
    const [, , state] = window.dataLayer.find((args) => args[0] === 'consent' && args[1] === 'default')
    expect(state.ad_storage).toBe('denied')
    expect(state.ad_user_data).toBe('denied')
    expect(state.ad_personalization).toBe('denied')
    expect(state.analytics_storage).toBe('denied')
  })

  it('grantConsent persists the choice and injects the GA + Clarity scripts exactly once even if called repeatedly', () => {
    grantConsent()
    grantConsent()
    grantConsent()

    expect(getConsent()).toBe('granted')
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1)
    expect(document.querySelectorAll('script[src*="clarity.ms/tag"]')).toHaveLength(1)
  })

  it('denyConsent persists the choice and injects nothing', () => {
    denyConsent()

    expect(getConsent()).toBe('denied')
    expect(document.querySelectorAll('script[src*="googletagmanager.com"]')).toHaveLength(0)
    expect(document.querySelectorAll('script[src*="clarity.ms"]')).toHaveLength(0)
  })

  it('persists the choice in localStorage across reloads', () => {
    grantConsent()
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')

    // simulate a fresh page load re-reading the stored value
    expect(getConsent()).toBe('granted')
  })
})
