import { DecryptedText, BlurText } from './fx.jsx'
import { ETSY_POSTER_URL, ETSY_URL, KOFI_URL } from '../config/site.js'
import '../styles/faq.css'

const readingUrl = KOFI_URL || 'https://ko-fi.com/slideshowastrology'
const posterUrl = ETSY_POSTER_URL || ETSY_URL

export default function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="faq-section">
      <div className="kicker"><DecryptedText text="04 — questions" /></div>
      <BlurText as="h2" id="faq-heading">asked, <span className="lite">answered</span></BlurText>
      <div className="faq-list reveal">
        <details>
          <summary className="mono">i don&apos;t know my birth time — can i still get a chart?</summary>
          <div>
            <p>yes. use 12:00 noon as a stand-in so you can still generate a full chart quickly. your ascendant and house cusps may shift, so those parts become approximate. kate can work around a missing time in a reading and focus on what remains reliable.</p>
          </div>
        </details>

        <details>
          <summary className="mono">placidus or whole sign — which should i pick?</summary>
          <div>
            <p>if you were born near the equator, placidus often behaves well and gives clean house structure. if you were born far north or south, whole sign is usually steadier and easier to interpret. if you already have a preference, that is always welcome.</p>
          </div>
        </details>

        <details>
          <summary className="mono">what does my chart include?</summary>
          <div>
            <p>you get your core placements, houses, and major aspects in one chart view. from there, you can tune colours, layout feel, and detail levels to match how you like to read. it is built to be both accurate and customisable.</p>
          </div>
        </details>

        <details>
          <summary className="mono">is it really free? what&apos;s the catch?</summary>
          <div>
            <p>yes, the generator is free to use with no account and no email gate. there is no hidden paywall for basic chart creation. readings and prints are optional, and they help fund the site.</p>
          </div>
        </details>

        <details>
          <summary className="mono">how do readings with kate work?</summary>
          <div>
            <p>readings are available via ko-fi, either as live sessions or written interpretations depending on what you need. you can choose the format that fits your pace and budget. start here: <a href={readingUrl} rel="noopener">book a reading ↗</a>.</p>
          </div>
        </details>

        <details>
          <summary className="mono">can i print my chart?</summary>
          <div>
            <p>yes. the free download is a screen-grade png, ideal for saving and sharing digitally. if you want a finished piece for your wall, the gallery-grade poster prints are in the shop: <a href={posterUrl} rel="noopener">browse poster prints ↗</a>.</p>
          </div>
        </details>
      </div>
    </section>
  )
}
