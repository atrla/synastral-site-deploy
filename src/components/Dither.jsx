import { useEffect, useRef } from 'react'

// dither tide — flowing waves rendered with a 4x4 Bayer ordered-dither,
// one pixel per grid cell, scaled up with image-rendering:pixelated.
// Periwinkle with moss accents on the paper background. No mouse interaction.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const PERI = [138, 148, 200]
const MOSS = [131, 153, 88]

export default function Dither({ px = 5 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const parent = canvas.parentElement
    let W = 0, H = 0, img = null
    let lastW = -1, lastH = -1

    const resize = () => {
      const r = parent.getBoundingClientRect()
      const w = Math.max(2, Math.ceil(r.width / px))
      const h = Math.max(2, Math.ceil(r.height / px))
      if (w === lastW && h === lastH) return // unchanged — skip the expensive recompute
      lastW = w; lastH = h
      W = w; H = h
      canvas.width = W
      canvas.height = H
      img = ctx.createImageData(W, H)
    }

    const draw = (t) => {
      const s = t / 1000
      const d = img.data
      for (let y = 0; y < H; y++) {
        const v = y / H
        for (let x = 0; x < W; x++) {
          const u = x / W
          let f = Math.sin(u * 6.3 + s * .5) * .5 +
            Math.sin(v * 4.7 - s * .35 + u * 2.1) * .35 +
            Math.sin((u + v) * 8.3 + s * .22) * .3
          f = (f * .5 + .5) * (1 - v * .6) // waves thin out toward the bottom
          const i = (y * W + x) * 4
          if (f > (BAYER[y & 3][x & 3] + .5) / 16) {
            const g = .5 + .5 * Math.sin(u * 5 - v * 3 + s * .18)
            const c = g > .68 ? MOSS : PERI
            d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 215
          } else {
            d[i + 3] = 0
          }
        }
      }
      ctx.putImageData(img, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches
    if (reduced) {
      draw(8000)
      return () => ro.disconnect()
    }

    // running: the "should be running" flag. The rAF callback checks it
    // before scheduling its next frame, so the loop stops dead (no more
    // rAF calls, no CPU/GPU work) as soon as it's flipped off, and resumes
    // from wherever the clock is when flipped back on — no state reset,
    // so there's no visible jump.
    let running = false
    let raf = null
    let last = 0

    const loop = (t) => {
      if (!running) return // stop here — do not schedule another frame
      if (t - last > 66) { draw(t); last = t } // ~15fps, plenty for a tide
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      if (raf) { cancelAnimationFrame(raf); raf = null }
    }

    let inView = false
    let tabVisible = document.visibilityState !== 'hidden'
    const sync = () => { (inView && tabVisible) ? start() : stop() }

    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting)
      sync()
    }, { threshold: 0 })
    io.observe(canvas)

    const onVisibility = () => {
      tabVisible = document.visibilityState !== 'hidden'
      sync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [px])

  return <div className="dither-bg" aria-hidden="true"><canvas ref={ref} aria-hidden="true" /></div>
}
