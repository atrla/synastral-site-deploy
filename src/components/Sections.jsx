import { DecryptedText, BlurText } from './fx.jsx'
import '../styles/shop.css'
import '../styles/metamorph.css'
import '../styles/footer.css'
import prints640 from '../assets/05-prints-640.webp?url'
import prints1280 from '../assets/05-prints-1280.webp?url'
import butterflySvg from '../assets/001-butterfly.svg?url'
import flowersSvg from '../assets/002-flowers.svg?url'
import { EMAIL, ETSY_POSTER_URL, ETSY_URL, KOFI_URL, TIKTOK_URL } from '../config/site.js'
import { track } from '../utils/track.js'

const shopUrl = ETSY_POSTER_URL || ETSY_URL
const emailHref = ['mailto', EMAIL].join(':')

export function Shop() {
  return (
    <section aria-labelledby="shop-heading">
      <div className="kicker"><DecryptedText text="03 — the shop" /></div>
      <BlurText as="h2" id="shop-heading">take the sky <span className="lite ser">home</span></BlurText>
      <div className="shop-band reveal">
        <div className="shop-copy">
          <p>Get chart poster prints and annual astrology planners from my shop, available in both digital and physical format with worldwide shipping.</p>
          <a className="btn" href={shopUrl} rel="noopener">visit the shop ↗</a>
        </div>
        <div className="shop-visual">
          <img
            src={prints640}
            srcSet={`${prints640} 640w, ${prints1280} 1280w`}
            sizes="(min-width: 64em) 30vw, calc(100vw - 2rem)"
            width="640" height="479"
            alt="Flat lay of Synastral chart-wheel prints, star zines, and mini-reading cards in blue ink on cream paper"
            loading="lazy" decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span className="chip mono">fig. 03 — prints · planners</span>
        </div>
      </div>
    </section>
  )
}

export function Metamorph() {
  return (
    <div className="metamorph">
      <span className="lbl mono">fig. 04 — metamorphosis, in progress</span>
      <img
        className="reveal"
        src={butterflySvg}
        width="294.71" height="238.47"
        alt=""
        loading="lazy" decoding="async"
        onError={(e) => { e.currentTarget.parentNode.style.display = 'none' }}
      />
      <span className="lbl2 mono">designed<br />to evolve</span>
    </div>
  )
}

export function Footer() {
  return (
    <footer id="contact">
      <img
        className="footer-flowers"
        src={flowersSvg}
        width="1039.4" height="486.75"
        alt="" aria-hidden="true"
        loading="lazy" decoding="async"
      />
      <div className="kicker"><DecryptedText text="05 — contact me" /></div>
      <span className="scatter" aria-hidden="true" style={{ right: '8%', top: 70, fontSize: 15, color: '#B7E0EA', opacity: .7, '--dur': '44s', '--dir': 'reverse' }}>✦</span>
      <BlurText as="div" className="big">say <span className="ser">hello</span> ✳</BlurText>
      <div className="contact-links">
        <a href={emailHref}><span className="lab">email</span> {EMAIL}</a>
        <a href={TIKTOK_URL} rel="noopener"><span className="lab">tiktok</span> @slideshowastrology ↗</a>
      </div>
      <p className="privacy-note mono">the chart generator above doesn't store your birth details — no account, nothing sold. analytics cookies only if you say yes.</p>
      <div className="row mono">
        <span>synastral — est. in the stars · [ end of record ]</span>
        <span><a href="#top">home</a> / <a href="#chart">birth chart</a> / <a href={KOFI_URL} rel="noopener" onClick={() => track('outbound_kofi', { source: 'footer' })}>chart readings ↗</a> / <a href={shopUrl} rel="noopener" onClick={() => track('outbound_etsy', { source: 'footer' })}>shop ↗</a> / <a href="#contact">contact</a></span>
      </div>
    </footer>
  )
}
