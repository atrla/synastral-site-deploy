import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// base './' so the built site works from any static host / subfolder
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // WP6: precompressed .gz/.br siblings for every emitted text asset
    // (JS/CSS/HTML/SVG) above ~1KB. These are dead weight unless the host
    // is configured to serve the precompressed file for a matching
    // Accept-Encoding request (Netlify/Cloudflare Pages/nginx do this
    // automatically when the sibling file exists; hosts that don't
    // support this just ignore the extra files — no runtime cost either
    // way since they never touch the JS bundle Vite serves by default).
    viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
  ],
})
