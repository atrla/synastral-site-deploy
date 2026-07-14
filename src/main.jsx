import React from 'react'
import ReactDOM from 'react-dom/client'

// Global tokens + element defaults — imported first so they load before any
// component stylesheet (component CSS is pulled in transitively via the
// App import below, and cascade order depends on this coming first).
import './styles/tokens.css'
import './styles/base.css'

// Self-hosted fonts (@fontsource) — replaces Google Fonts <link> tags.
// Only the weights actually used in src/ CSS are imported (latin subset).
// (Audited 2026-07-13: no component or stylesheet sets font-style:italic or
// font-weight:500 anywhere, so the italic Crimson Pro cut and the DM Mono
// 500 weight that used to be imported here were dead weight — removed.)
import '@fontsource/gloock/latin-400.css'
import '@fontsource/pinyon-script/latin-400.css'
import '@fontsource/young-serif/latin-400.css'
import '@fontsource/crimson-pro/latin-400.css'
import '@fontsource/crimson-pro/latin-600.css'
import '@fontsource/dm-mono/latin-400.css'

import App from './App.jsx'

// WP8: the built dist/index.html is prerendered (see scripts/prerender.mjs)
// so #root already contains real markup in production — hydrateRoot lets
// React reuse that DOM instead of throwing it away and re-rendering from
// scratch. In dev (`vite dev`) index.html is served raw with an empty
// #root, so we fall back to a plain client render — hydrating an empty
// node would just produce a harmless-but-noisy mismatch warning on every
// dev reload for no benefit.
const rootEl = document.getElementById('root')
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if (rootEl.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootEl, app)
} else {
  ReactDOM.createRoot(rootEl).render(app)
}
