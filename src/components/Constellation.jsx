import { useEffect, useRef } from 'react'

// One procedurally generated constellation per page load, drawn like an
// astronomer's ink diagram on paper: dashed lines, ink stars, lilac flecks.
// Figure is generated in normalised coords so it survives resizes; a fresh
// figure appears on every refresh.
function makeFigure() {
  const n = 5 + Math.floor(Math.random() * 5) // 5–9 stars
  const pts = []
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
  let x = .18 + Math.random() * .5
  let y = .25 + Math.random() * .4
  let ang = Math.random() * Math.PI * 2
  const step = .13 + Math.random() * .05
  for (let i = 0; i < n; i++) {
    pts.push({ x, y, r: 1.7 + Math.random() * 2, tw: Math.random() * Math.PI * 2 })
    if (i > 0 && (i % 2 === 0 || Math.random() < .25)) {
      ang = Math.random() * Math.PI * 2
    } else {
      ang += (Math.random() - .5) * 2.6
      if (Math.random() < .35) ang += (Math.random() < .5 ? -1 : 1) * (Math.PI * (.25 + Math.random() * .35))
    }
    const move = step * (.75 + Math.random() * 1.15)
    const drift = (Math.random() - .5) * step * .95
    x = clamp(x + Math.cos(ang) * move + Math.cos(ang + Math.PI / 2) * drift, .06, .94)
    y = clamp(y + Math.sin(ang) * move + Math.sin(ang + Math.PI / 2) * drift * .9, .14, .86)
  }
  const edges = []
  for (let i = 1; i < n; i++) edges.push([i - 1, i])
  // a branch or two, like real constellations
  const branches = Math.random() < .65 ? 1 + (Math.random() < .3 ? 1 : 0) : 0
  for (let b = 0; b < branches; b++) {
    const from = 1 + Math.floor(Math.random() * (pts.length - 2))
    const a2 = Math.random() * Math.PI * 2
    const bx = Math.min(.94, Math.max(.06, pts[from].x + Math.cos(a2) * step))
    const by = Math.min(.86, Math.max(.14, pts[from].y + Math.sin(a2) * step * .9))
    pts.push({ x: bx, y: by, r: 1.5 + Math.random() * 1.6, tw: Math.random() * Math.PI * 2 })
    edges.push([from, pts.length - 1])
  }

  const minX = Math.min(...pts.map(p => p.x))
  const maxX = Math.max(...pts.map(p => p.x))
  const minY = Math.min(...pts.map(p => p.y))
  const maxY = Math.max(...pts.map(p => p.y))
  const width = Math.max(maxX - minX, 0.0001)
  const height = Math.max(maxY - minY, 0.0001)
  const padding = 0.08
  const scale = Math.min((1 - padding * 2) / width, (1 - padding * 2) / height)
  const offsetX = (1 - width * scale) / 2 - minX * scale
  const offsetY = (1 - height * scale) / 2 - minY * scale

  for (const p of pts) {
    p.x = p.x * scale + offsetX
    p.y = p.y * scale + offsetY
  }

  return { pts, edges }
}

export default function Constellation() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const figure = makeFigure()
    let field = []
    let w = 0, h = 0
    let lastW = -1, lastH = -1

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect()
      const rw = r.width, rh = r.height
      if (rw === lastW && rh === lastH) return // unchanged — skip the expensive recompute
      lastW = rw; lastH = rh
      w = rw; h = rh
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round((w * h) / 5500)
      field = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: .4 + Math.random() * .9,
        tw: Math.random() * Math.PI * 2,
        sp: .5 + Math.random() * 1.4,
      }))
    }

    const draw = (t) => {
      const s = t / 1000
      ctx.clearRect(0, 0, w, h)

      // faint lilac flecks
      for (const st of field) {
        const a = .18 + .3 * (0.5 + 0.5 * Math.sin(s * st.sp + st.tw))
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(138,148,200,${a})`
        ctx.fill()
      }

      // constellation lines — dashed, like a chart figure
      ctx.strokeStyle = 'rgba(10,51,35,.4)'
      ctx.lineWidth = .8
      ctx.setLineDash([4, 4])
      for (const [a, b] of figure.edges) {
        ctx.beginPath()
        ctx.moveTo(figure.pts[a].x * w, figure.pts[a].y * h)
        ctx.lineTo(figure.pts[b].x * w, figure.pts[b].y * h)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // constellation stars — ink dots with a soft lilac halo
      for (const p of figure.pts) {
        const px = p.x * w, py = p.y * h
        const a = .65 + .3 * Math.sin(s * 1.1 + p.tw)
        ctx.beginPath()
        ctx.arc(px, py, p.r * 2.4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(158,160,222,.18)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px, py, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(10,51,35,${a})`
        ctx.fill()
        // four-point sparkle on the brighter stars
        if (p.r > 2.6) {
          ctx.strokeStyle = `rgba(10,51,35,${a * .5})`
          ctx.lineWidth = .7
          const l = p.r * 3
          ctx.beginPath()
          ctx.moveTo(px - l, py); ctx.lineTo(px + l, py)
          ctx.moveTo(px, py - l); ctx.lineTo(px, py + l)
          ctx.stroke()
        }
      }
    }

    resize()
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()) })
    ro.observe(canvas.parentElement)

    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches
    if (reduced) {
      draw(4000)
      return () => ro.disconnect()
    }

    // running: the "should be running" flag. The rAF callback checks it
    // before scheduling its next frame, so the loop stops dead (no more
    // rAF calls, no CPU/GPU work) as soon as it's flipped off, and resumes
    // from wherever the clock is when flipped back on — no state reset,
    // so there's no visible jump.
    let running = false
    let raf = null

    const loop = (t) => {
      if (!running) return // stop here — do not schedule another frame
      draw(t)
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
  }, [])

  return <canvas ref={ref} className="const-canvas" aria-hidden="true" />
}
