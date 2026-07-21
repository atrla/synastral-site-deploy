import { DecryptedText, BlurText } from './fx.jsx'
import { ETSY_POSTER_URL, ETSY_URL, KOFI_URL } from '../config/site.js'
import '../styles/faq.css'

const readingUrl = KOFI_URL || 'https://ko-fi.com/slideshowastrology'
const posterUrl = ETSY_POSTER_URL || ETSY_URL

export default function Faq() {
  const handleToggle = (event) => {
    const details = event.currentTarget

    if (details.dataset.animating) {
      return
    }

    const content = details.querySelector('.details-content')

    if (!content) {
      return
    }

    if (details.open) {
      details.dataset.animating = 'opening'
      content.style.overflow = 'hidden'
      content.style.height = '0px'
      content.style.opacity = '0'
      content.getBoundingClientRect()

      requestAnimationFrame(() => {
        content.style.height = `${content.scrollHeight}px`
        content.style.opacity = '1'
      })
      return
    }

    details.dataset.animating = 'closing'
    details.open = true
    details.classList.add('is-closing')
    content.style.overflow = 'hidden'
    content.style.height = `${content.scrollHeight}px`
    content.style.opacity = '1'
    content.getBoundingClientRect()

    requestAnimationFrame(() => {
      content.style.height = '0px'
      content.style.opacity = '0'
    })
  }

  const handleTransitionEnd = (event) => {
    if (event.propertyName !== 'height') {
      return
    }

    const content = event.currentTarget
    const details = content.closest('details')

    if (!details?.dataset.animating) {
      return
    }

    if (details.dataset.animating === 'opening') {
      content.style.height = 'auto'
      content.style.opacity = '1'
      content.style.overflow = ''
      delete details.dataset.animating
      return
    }

    if (details.dataset.animating === 'closing') {
      details.classList.remove('is-closing')
      details.open = false
      content.style.height = ''
      content.style.opacity = ''
      content.style.overflow = ''

      requestAnimationFrame(() => {
        delete details.dataset.animating
      })
    }
  }

  return (
    <section aria-labelledby="faq-heading" className="faq-section">
      <div className="kicker"><DecryptedText text="04 — questions" /></div>
      <BlurText as="h2" id="faq-heading">asked, <span className="lite">answered</span></BlurText>
      <div className="faq-list reveal">
        <details onToggle={handleToggle}>
          <summary className="mono">i don&apos;t know my birth time — can i still get a chart?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>yes. use 12:00 noon as a stand-in so you can still generate a full chart quickly. your ascendant and house cusps may shift, so those parts become approximate. kate can work around a missing time in a reading and focus on what remains reliable.</p>
          </div>
        </details>

        <details onToggle={handleToggle}>
          <summary className="mono">placidus or whole sign — which should i pick?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>if you were born near the equator, placidus often behaves well and gives clean house structure. if you were born far north or south, whole sign is usually steadier and easier to interpret. if you already have a preference, that is always welcome.</p>
          </div>
        </details>

        <details onToggle={handleToggle}>
          <summary className="mono">what does my chart include?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>you get your core placements, houses, and major aspects in one chart view. from there, you can tune colours, layout feel, and detail levels to match how you like to read. it is built to be both accurate and customisable.</p>
          </div>
        </details>

        <details onToggle={handleToggle}>
          <summary className="mono">is it really free? what&apos;s the catch?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>yes, the generator is free to use with no account and no email gate. there is no hidden paywall for basic chart creation. readings and prints are optional, and they help fund the site.</p>
          </div>
        </details>

        <details onToggle={handleToggle}>
          <summary className="mono">how do readings with kate work?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>readings are available via ko-fi, either as live sessions or written interpretations depending on what you need. you can choose the format that fits your pace and budget. start here: <a href={readingUrl} rel="noopener">book a reading ↗</a>.</p>
          </div>
        </details>

        <details onToggle={handleToggle}>
          <summary className="mono">can i print my chart?</summary>
          <div className="details-content" onTransitionEnd={handleTransitionEnd}>
            <p>yes. the free download is a screen-grade png, ideal for saving and sharing digitally. if you want a finished piece for your wall, the gallery-grade poster prints are in the shop: <a href={posterUrl} rel="noopener">browse poster prints ↗</a>.</p>
          </div>
        </details>
      </div>
    </section>
  )
}
