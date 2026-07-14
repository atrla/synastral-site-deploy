import { Children, useEffect, useRef, useState } from 'react'

const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches

// decrypted-text: shows the real text, then scrambles and resolves
// left-to-right when triggered ('load' = on mount, 'view' = on scroll into view)
export function DecryptedText({ text, start = 'view', speed = 30, className }) {
  const ref = useRef(null)
  const [out, setOut] = useState(text)

  useEffect(() => {
    if (reduced()) { setOut(text); return }
    let timer, obs
    const chars = '✳✦☽☿abcdefghjkmnpqrstuvwxyz0123456789—/·'
    const run = () => {
      let p = 0
      timer = setInterval(() => {
        p++
        if (p >= text.length) { setOut(text); clearInterval(timer); return }
        let s = text.slice(0, p)
        for (let i = p; i < text.length; i++) {
          s += text[i] === ' ' ? ' ' : chars[(Math.random() * chars.length) | 0]
        }
        setOut(s)
      }, speed)
    }
    if (start === 'load') run()
    else {
      obs = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { obs.disconnect(); run() }
      }, { rootMargin: '-6% 0px' })
      obs.observe(ref.current)
    }
    return () => { clearInterval(timer); obs?.disconnect() }
  }, [text, start, speed])

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  )
}

// blur-text: words blur/rise into place with a small stagger when scrolled
// into view. Element children (styled spans) animate as one unit.
export function BlurText({ children, as: Tag = 'h2', className = '', stagger = 70, id }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (reduced()) { setOn(true); return }
    const obs = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { obs.disconnect(); setOn(true) }
    }, { rootMargin: '-8% 0px' })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const units = []
  Children.forEach(children, c => {
    if (typeof c === 'string') c.split(/(\s+)/).forEach(w => { if (w) units.push(w) })
    else units.push(c)
  })
  let d = 0
  return (
    <Tag ref={ref} id={id} className={`${className} blur-text${on ? ' on' : ''}`.trim()}>
      {units.map((u, i) => (typeof u === 'string' && /^\s+$/.test(u))
        ? <span key={i}> </span>
        : <span key={i} className="bt" style={{ transitionDelay: `${(d++) * stagger}ms` }}>{u}</span>)}
    </Tag>
  )
}
