import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_STORAGE_KEY } from './consent.js'
import { track } from './track.js'

describe('track', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.gtag = vi.fn()
  })

  afterEach(() => {
    window.localStorage.clear()
    delete window.gtag
  })

  it('no-ops when no consent choice has been made yet', () => {
    track('chart_generated', {})
    expect(window.gtag).not.toHaveBeenCalled()
  })

  it('no-ops when consent has been denied', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied')
    track('chart_generated', {})
    expect(window.gtag).not.toHaveBeenCalled()
  })

  it('calls gtag with the event and props once consent is granted', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
    track('outbound_kofi', { source: 'nav' })
    expect(window.gtag).toHaveBeenCalledWith('event', 'outbound_kofi', { source: 'nav' })
  })

  it('never throws when window.gtag is missing, even with consent granted', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
    delete window.gtag
    expect(() => track('chart_exported', {})).not.toThrow()
  })
})
