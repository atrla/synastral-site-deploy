import { ETSY_POSTER_URL, ETSY_URL, KOFI_URL } from '../config/site.js'
import { track } from '../utils/track.js'
import '../styles/upsell.css'

const shopUrl = ETSY_POSTER_URL || ETSY_URL

export default function ResultUpsell() {
  return (
    <aside className="upsell result-upsell" aria-label="what next options">
      <div className="kicker">what next?</div>
      <h3 className="upsell-title">your chart, taken further</h3>
      <p className="upsell-download">download your chart as a free png from the chart controls above.</p>
      <a className="btn" href={KOFI_URL} target="_blank" rel="noopener noreferrer" onClick={() => track('outbound_kofi', { source: 'upsell' })}>get your chart read by kate ↗</a>
      <a className="upsell-link" href={shopUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('outbound_etsy', { source: 'upsell' })}>gallery-grade poster prints ↗</a>
    </aside>
  )
}
