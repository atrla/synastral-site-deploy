import { DecryptedText, BlurText } from './fx.jsx'
import '../styles/shop.css'
import '../styles/metamorph.css'
import '../styles/footer.css'
import prints640 from '../assets/05-prints-640.webp?url'
import prints1280 from '../assets/05-prints-1280.webp?url'
import butterflySvg from '../assets/001-butterfly.svg?url'
import flowersSvg from '../assets/002-flowers.svg?url'

export function Shop() {
  return (
    <section aria-labelledby="shop-heading">
      <div className="star-rule" aria-hidden="true"><span style={{ '--dur': '34s', '--dir': 'reverse' }}>✦</span></div>
      <div className="kicker"><DecryptedText text="03 — the shop" /></div>
      <BlurText as="h2" id="shop-heading">take the sky <span className="lite ser">home</span></BlurText>
      <div className="shop-band reveal">
        <div className="shop-copy">
          <p>Chart posters in the house style, seasonal zines, written mini-readings, and small strange objects from the studio. These chart prints keep the same house style as the free chart above, printed clean and shipped worldwide.</p>
          <a className="btn" href="https://etsy.com/shop/synastral" rel="noopener">visit the shop ↗</a>
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
      <div className="kicker"><DecryptedText text="04 — contact me" /></div>
      <span className="scatter" aria-hidden="true" style={{ right: '8%', top: 70, fontSize: 15, color: '#B7E0EA', opacity: .7, '--dur': '44s', '--dir': 'reverse' }}>✦</span>
      <BlurText as="div" className="big">say <span className="ser">hello</span> ✳</BlurText>
      <div className="contact-links">
        <a href="mailto:kate@synastral.com"><span className="lab">email</span> kate@synastral.com</a>
        <a href="https://tiktok.com/@slideshowastrology" rel="noopener"><span className="lab">tiktok</span> @slideshowastrology ↗</a>
      </div>
      <div className="row mono">
        <span>synastral — est. in the stars · [ end of record ]</span>
        <span><a href="#top">home</a> / <a href="#chart">birth chart</a> / <a href="https://ko-fi.com/synastral" rel="noopener">book ↗</a> / <a href="https://etsy.com/shop/synastral" rel="noopener">shop ↗</a> / <a href="#contact">contact</a></span>
      </div>
    </footer>
  )
}
