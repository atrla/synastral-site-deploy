import { useEffect, useRef, useState } from 'react'
import Dither from './Dither.jsx'
import '../styles/hero.css'
import iris1000 from '../assets/08-iris-1000.webp?url'
import chartWheel640 from '../assets/03-chart-wheel-640.webp?url'
import chartWheel1280 from '../assets/03-chart-wheel-1280.webp?url'

const FIELD_ERRORS = {
  date: 'enter a date of birth',
  time: "enter a time — 'around noon' works fine",
  place: 'enter a place of birth',
}

export default function Hero() {
  const rightRef = useRef(null)
  const irisRef = useRef(null)
  const genRef = useRef(null)
  const dateRef = useRef(null)
  const timeRef = useRef(null)
  const placeRef = useRef(null)

  const [values, setValues] = useState({ name: '', date: '', time: '', place: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const setField = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSubmit = (e) => {
    e.preventDefault()
    const next = {}
    if (!values.date.trim()) next.date = FIELD_ERRORS.date
    if (!values.time.trim()) next.time = FIELD_ERRORS.time
    if (!values.place.trim()) next.place = FIELD_ERRORS.place
    setErrors(next)
    if (Object.keys(next).length) {
      setSubmitted(false)
      const firstBad = next.date ? dateRef : next.time ? timeRef : placeRef
      firstBad.current?.focus()
      return
    }
    setSubmitted(true)
  }

  // parallax: print drifts up, iris drifts down
  useEffect(() => {
    const fancy = matchMedia('(pointer:fine)').matches &&
      !matchMedia('(prefers-reduced-motion:reduce)').matches
    if (!fancy) return
    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        const y = Math.min(scrollY, 900)
        rightRef.current?.style.setProperty('--py', y * -.05 + 'px')
        irisRef.current?.style.setProperty('--iy', y * .12 + 'px')
        queued = false
      })
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  const onGenMove = (e) => {
    const gen = genRef.current
    const r = gen.getBoundingClientRect()
    gen.style.setProperty('--mx', (e.clientX - r.left) + 'px')
    gen.style.setProperty('--my', (e.clientY - r.top) + 'px')
  }

  return (
    <div className="hero" id="chart">
      <Dither />
      <div className="hero-left">
        <div className="eyebrow mono">01 — synastral / astrology by kate<span className="caret">█</span></div>
        <h1>
          <span className="line">your <span className="strong">birth chart,</span></span>
          <span className="line"><span className="ser">free &amp;</span></span>
          <span className="line"><span className="strong">no strings.</span></span>
        </h1>
        <p className="tag">Enter the moment you were born, get your full natal wheel in the <b>Synastral house style</b> — houses, aspects, placements. Right here, right now.</p>

        <form className="gen" id="chart-form" tabIndex={-1} ref={genRef} onPointerMove={onGenMove} onSubmit={onSubmit} noValidate>
          <div className="gen-head">
            <span className="t">✳ generate your chart</span>
            <span className="free mono">free / 60 seconds</span>
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="g-name">name</label>
              <input id="g-name" name="name" type="text" autoComplete="name" placeholder="e.g. Auracle"
                value={values.name} onChange={setField('name')} />
            </div>
            <div>
              <label htmlFor="g-date">date of birth</label>
              <input id="g-date" name="birth-date" type="text" inputMode="text" autoComplete="bday" placeholder="dd / mm / yyyy"
                required ref={dateRef} value={values.date} onChange={setField('date')}
                aria-invalid={errors.date ? 'true' : undefined}
                aria-describedby={errors.date ? 'g-date-err' : undefined} />
              {errors.date && <p className="field-err mono" id="g-date-err">{errors.date}</p>}
            </div>
            <div>
              <label htmlFor="g-time">time of birth</label>
              <input id="g-time" name="birth-time" type="text" placeholder="'around noon' works"
                required ref={timeRef} value={values.time} onChange={setField('time')}
                aria-invalid={errors.time ? 'true' : undefined}
                aria-describedby={errors.time ? 'g-time-err' : undefined} />
              {errors.time && <p className="field-err mono" id="g-time-err">{errors.time}</p>}
            </div>
            <div>
              <label htmlFor="g-place">place of birth</label>
              <input id="g-place" name="birth-place" type="text" autoComplete="address-level2" placeholder="city, country"
                required ref={placeRef} value={values.place} onChange={setField('place')}
                aria-invalid={errors.place ? 'true' : undefined}
                aria-describedby={errors.place ? 'g-place-err' : undefined} />
              {errors.place && <p className="field-err mono" id="g-place-err">{errors.place}</p>}
            </div>
          </div>

          {submitted ? (
            <div className="gen-outcome" role="status">
              <p className="fine">✳ chart details confirmed — the generator is in its final calibration, and your wheel will draw right here very soon. can't wait? kate reads charts the old way: by eye, by hand.</p>
              <a className="btn" href="https://ko-fi.com/synastral" rel="noopener">book with kate <span className="arrow">→</span>&hairsp;↗</a>
            </div>
          ) : (
            <>
              <button className="btn" type="submit">generate my chart →</button>
              <p className="fine">No account, no email, no catch. The chart renders on this page and it's yours.</p>
            </>
          )}
        </form>
      </div>

      <div className="hero-right" ref={rightRef}>
        <div className="blob b1"></div><div className="blob b2"></div>
        <div className="hero-iris" ref={irisRef}>
          <img
            src={iris1000}
            width="1000" height="1000"
            alt=""
            loading="lazy" decoding="async"
            onError={(e) => { e.currentTarget.parentNode.style.display = 'none' }}
          />
        </div>
        <div className="print-frame">
          <img
            src={chartWheel640}
            srcSet={`${chartWheel640} 640w, ${chartWheel1280} 1280w`}
            sizes="(min-width: 64em) 38vw, calc(100vw - 2rem)"
            width="640" height="640"
            alt="Example natal chart wheel with houses and aspects, Synastral house style"
            fetchpriority="high" decoding="async"
            onError={(e) => { e.currentTarget.style.minHeight = '300px' }}
          />
          <div className="plabel mono"><span>synastral — natal record</span><span>fig. 01</span></div>
        </div>
      </div>
    </div>
  )
}
