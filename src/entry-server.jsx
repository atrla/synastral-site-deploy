// Node-only SSR entry (WP8). Rendered with react-dom/server's renderToString
// inside scripts/prerender.mjs — no browser, no DOM, no headless Chrome.
// Kept separate from main.jsx (which does the client `hydrateRoot` mount and
// pulls in @fontsource CSS) so this module has zero DOM-mounting side effects
// and can be safely imported and executed under plain Node.
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export function render() {
  return renderToString(<App />)
}
