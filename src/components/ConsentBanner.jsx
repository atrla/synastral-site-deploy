import { useEffect, useState } from 'react'
import { denyConsent, getConsent, grantConsent, initConsentDefaults } from '../utils/consent.js'
import '../styles/consent.css'

// Mount-gated so SSR (renderToString in entry-server.jsx) and the client's
// very first render both produce nothing — `mounted` starts false and only
// flips true from an effect, which never runs during SSR or before the
// initial paint. That keeps hydrateRoot's markup an exact match (no
// hydration-mismatch warning) and guarantees no analytics choice is ever
// rendered/decided from server-side markup.
export default function ConsentBanner() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    initConsentDefaults()

    const stored = getConsent()
    if (stored === 'granted') {
      grantConsent()
    } else if (stored === 'denied') {
      denyConsent()
    } else {
      setVisible(true)
    }
  }, [])

  if (!mounted || !visible) return null

  const handleGrant = () => {
    grantConsent()
    setVisible(false)
  }

  const handleDeny = () => {
    denyConsent()
    setVisible(false)
  }

  return (
    <div className="consent-banner mono" role="region" aria-label="cookie consent">
      <p className="consent-copy">this site uses cookies for analytics - all data is kept strictly private</p>
      <div className="consent-actions">
        <button type="button" className="consent-accept" onClick={handleGrant}>fine by me</button>
        <button type="button" className="consent-decline" onClick={handleDeny}>no thanks</button>
      </div>
    </div>
  )
}
