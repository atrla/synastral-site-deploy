import { useEffect, useState } from 'react'
import { DecryptedText } from './fx.jsx'

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav id="top" className={menuOpen ? 'nav-open' : ''}>
      <div className="logo">synastral<span className="glyph">✧</span></div>
      <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-nav"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(open => !open)}>
        <span>{menuOpen ? 'close' : 'menu'}</span><span className="nav-toggle-icon" aria-hidden="true" />
      </button>
      <ul id="primary-nav">
        <li><a href="#top" onClick={closeMenu}>home</a></li>
        <li><a href="#chart" onClick={closeMenu}>chart generator</a></li>
        <li><a href="https://ko-fi.com/slideshowastrology" className="ext" rel="noopener">chart readings</a></li>
        <li><a href="https://etsy.com/shop/synastralco" className="ext" rel="noopener">shop</a></li>
        <li><a href="#contact" onClick={closeMenu}>contact</a></li>
      </ul>
    </nav>
  )
}

// data strip: current sun sign, moon sign, moon phase
function ephemeris() {
  const signs = [['capricorn', 119], ['aquarius', 218], ['pisces', 320], ['aries', 419],
    ['taurus', 520], ['gemini', 620], ['cancer', 722], ['leo', 822], ['virgo', 922],
    ['libra', 1022], ['scorpio', 1121], ['sagittarius', 1221], ['capricorn', 1231]]
  const now = new Date(), md = (now.getMonth() + 1) * 100 + now.getDate()
  const sun = signs.find(s => md <= s[1])[0]

  // lunar ephemeris
  const rad = Math.PI / 180, norm = x => ((x % 360) + 360) % 360
  const zod = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
  const dj = Date.now() / 86400000 + 2440587.5 - 2451545 // days since J2000
  const moonLon = norm(218.316 + 13.176396 * dj +
    6.289 * Math.sin(norm(134.963 + 13.064993 * dj) * rad))
  const moon = zod[Math.floor(moonLon / 30)]
  const sunLon = norm(280.459 + 0.98564736 * dj)
  const phases = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
    'full moon', 'waning gibbous', 'last quarter', 'waning crescent']
  const phase = phases[Math.round(norm(moonLon - sunLon) / 45) % 8]
  return { sun, moon, phase }
}

const PLACEHOLDER = { sun: '—', moon: '—', phase: '—' }

export function DataStrip() {
  const [{ sun, moon, phase }, setEph] = useState(PLACEHOLDER)
  useEffect(() => { setEph(ephemeris()) }, [])
  return (
    <div className="datastrip mono">
      <span className="ds-hide">the sky in motion</span>
      <span>☉ today's sun in <DecryptedText className="accent" start="load" text={sun} /></span>
      <span>☽ today's moon in <DecryptedText className="accent" start="load" text={moon} /></span>
      <span>today's moon phase: <DecryptedText className="accent" start="load" text={phase} /></span>
    </div>
  )
}
