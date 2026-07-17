import { ETSY_POSTER_URL, ETSY_URL, KOFI_URL } from '../config/site.js'
import '../styles/upsell.css'

const shopUrl = ETSY_POSTER_URL || ETSY_URL

export default function ResultUpsell() {
  return (
    <aside className="upsell result-upsell" aria-label="what next options">
      <span className="mlabel mono">what next?</span>
      <div className="upsell-copy">
        <h3>your chart, taken further</h3>
        <p>download the free png now, then choose a guided reading or gallery-grade poster print when you want more depth and a keepsake finish.</p>
      </div>
      <div className="upsell-actions">
        <a className="btn" href={KOFI_URL} target="_blank" rel="noopener noreferrer">get your chart read by kate ↗</a>
        <a className="upsell-link" href={shopUrl} target="_blank" rel="noopener noreferrer">want it on your wall? gallery-grade poster prints ↗</a>
      </div>
    </aside>
  )
}
