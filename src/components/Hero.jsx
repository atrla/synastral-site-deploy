import { useCallback, useEffect, useRef, useState } from 'react'
import Dither from './Dither.jsx'
import ChartView from './ChartView.jsx'
import CustomizePanel from './CustomizePanel.jsx'
import { normalizePlaceOption, resolvePlaceSelection } from '../utils/placeOptions.js'
import { buildDefaultWheelConfig } from '../utils/chartDefaults.js'
import '../styles/hero.css'

const API_BASE = (import.meta.env.VITE_CHART_API_BASE || '').trim()
const buildApiUrl = (path) => {
  const normalizedPath = path.replace(/^\/+/, '')
  if (!API_BASE) return `/${normalizedPath}`
  return `${API_BASE.replace(/\/+$/, '')}/${normalizedPath}`
}
const FIELD_ERRORS = {
  date: 'enter a date of birth',
  time: 'enter a time of birth',
  place: 'select a place of birth',
}

export default function Hero() {
  const rightRef = useRef(null)
  const genRef = useRef(null)
  const dateRef = useRef(null)
  const timeRef = useRef(null)
  const placeRef = useRef(null)

  const [values, setValues] = useState({ date: '', time: '', place: '', lat: '', lon: '' })
  const [errors, setErrors] = useState({})
  const [placeOptions, setPlaceOptions] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [wheelConfig, setWheelConfig] = useState(() => buildDefaultWheelConfig())
  const [chartSvg, setChartSvg] = useState('')
  const [chartError, setChartError] = useState('')
  const [chartLoading, setChartLoading] = useState(false)
  const [chartLoaded, setChartLoaded] = useState(false)
  const [viewMode, setViewMode] = useState('form')
  const [isTransitioningOut, setIsTransitioningOut] = useState(false)
  const [pendingView, setPendingView] = useState(null)

  const requestSeq = useRef(0)
  const wheelChangeRef = useRef(false)

  const onGenMove = (e) => {
    const gen = genRef.current
    if (!gen) return
    const r = gen.getBoundingClientRect()
    gen.style.setProperty('--mx', `${e.clientX - r.left}px`)
    gen.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const setField = (key) => (e) => {
    const next = { ...values, [key]: e.target.value }
    if (key === 'place') {
      const { lat, lon } = resolvePlaceSelection(e.target.value, placeOptions)
      next.lat = lat
      next.lon = lon
    }
    setValues(next)
  }

  const validateRequired = () => {
    const next = {}
    if (!values.date.trim()) next.date = FIELD_ERRORS.date
    if (!values.time.trim()) next.time = FIELD_ERRORS.time
    if (!values.place.trim() || !values.lat || !values.lon) next.place = FIELD_ERRORS.place
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const canGenerate = Boolean(values.date && values.time && values.lat && values.lon)

  const generateChart = useCallback(async ({ force = false } = {}) => {
    if (!canGenerate) return false
    if (!force && !chartLoaded) return false

    const seq = ++requestSeq.current
    setChartLoading(true)
    setChartError('')

    try {
      const body = {
        birth_date: values.date,
        birth_time: values.time,
        birth_lat: Number(values.lat),
        birth_lon: Number(values.lon),
        wheel_config: wheelConfig,
      }
      const response = await fetch(buildApiUrl('api/chart/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (seq !== requestSeq.current) return false

      const payload = await response.json()
      if (!response.ok) {
        setChartError(payload.detail || 'couldn\'t generate chart — check your inputs')
        return false
      }

      const nextConfig = {
        ...buildDefaultWheelConfig(),
        ...wheelConfig,
        ...(payload.wheel_config || {}),
      }

      setChartSvg(payload.svg || '')
      setChartError('')
      setChartLoaded(true)
      setWheelConfig(nextConfig)
      return true
    } catch {
      if (seq !== requestSeq.current) return false
      setChartError('couldn\'t reach the generator, try again')
      return false
    } finally {
      if (seq === requestSeq.current) setChartLoading(false)
    }
  }, [canGenerate, chartLoaded, values.date, values.time, values.lat, values.lon, wheelConfig])

  useEffect(() => {
    if (values.place.trim().length < 2) {
      setPlaceOptions([])
      setPlacesLoading(false)
      return
    }

    const query = values.place.trim()
    const handle = window.setTimeout(async () => {
      setPlacesLoading(true)
      try {
        const response = await fetch(`${buildApiUrl('api/chart/places')}?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
          setPlaceOptions([])
          return
        }
        const data = await response.json()
        if (values.place.trim() === query) {
          setPlaceOptions(Array.isArray(data) ? data.map(normalizePlaceOption) : [])
        }
      } catch {
        setPlaceOptions([])
      } finally {
        setPlacesLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [values.place])

  useEffect(() => {
    if (!wheelChangeRef.current) return
    wheelChangeRef.current = false

    if (chartLoaded && canGenerate) {
      const timer = window.setTimeout(() => {
        generateChart()
      }, 300)
      return () => window.clearTimeout(timer)
    }
  }, [wheelConfig, chartLoaded, canGenerate, generateChart])

  const updateWheelConfig = (key, value) => {
    setWheelConfig((current) => ({ ...current, [key]: value }))
    wheelChangeRef.current = true
  }

  const handleSettingsUpdate = (patch) => {
    setWheelConfig((current) => ({ ...current, ...patch }))
    wheelChangeRef.current = true
  }

  const handleContinue = async (e) => {
    e.preventDefault()
    const valid = validateRequired()
    if (!valid) {
      const firstBad = errors.date ? dateRef : errors.time ? timeRef : placeRef
      firstBad.current?.focus()
      return
    }

    setIsTransitioningOut(true)
    const success = await generateChart({ force: true })
    if (success) {
      setPendingView('chart')
    } else {
      setIsTransitioningOut(false)
      setPendingView(null)
    }
  }

  const handleTransitionEnd = () => {
    if (isTransitioningOut && pendingView) {
      setViewMode(pendingView)
      setPendingView(null)
      setIsTransitioningOut(false)
    }
  }

  const handleCustomize = () => {
    setViewMode('customize')
  }

  const handleBackToChart = () => {
    setViewMode('chart')
  }

  const renderFormView = () => (
    <div className={`hero-intro ${isTransitioningOut ? 'fade-out-up' : ''}`} onAnimationEnd={handleTransitionEnd}>
      <div className="eyebrow mono">01 — synastral / astrology by kate<span className="caret">█</span></div>
      <h1>
        <span className="line">your <span className="strong">birth chart,</span></span>
        <span className="line"><span className="ser">free &amp;</span></span>
        <span className="line"><span className="strong">no strings.</span></span>
      </h1>
      <p className="tag">Enter the moment you were born, get your full natal wheel in the <b>Synastral house style</b> — houses, aspects, placements. Right here, right now.</p>

      <form className="gen" id="chart-form" tabIndex={-1} ref={genRef} onPointerMove={onGenMove} onSubmit={handleContinue} noValidate>
        <div className="gen-head">
          <span className="t">✳ generate your chart</span>
          <span className="free mono">free / 60 seconds</span>
        </div>

        <div className="birth-inputs">
          <div>
            <label htmlFor="g-date">date of birth</label>
            <input id="g-date" name="birth-date" type="date" autoComplete="bday"
              required ref={dateRef} value={values.date} onChange={setField('date')}
              aria-invalid={errors.date ? 'true' : undefined}
              aria-describedby={errors.date ? 'g-date-err' : undefined} />
            {errors.date && <p className="field-err mono" id="g-date-err">{errors.date}</p>}
          </div>
          <div>
            <label htmlFor="g-time">time of birth</label>
            <input id="g-time" name="birth-time" type="time"
              required ref={timeRef} value={values.time} onChange={setField('time')}
              aria-invalid={errors.time ? 'true' : undefined}
              aria-describedby={errors.time ? 'g-time-err' : undefined} />
            {errors.time && <p className="field-err mono" id="g-time-err">{errors.time}</p>}
          </div>
          <div>
            <label htmlFor="g-place">place of birth</label>
            <input id="g-place" name="birth-place" type="text" autoComplete="address-level2" placeholder="city, country"
              required ref={placeRef} value={values.place} onChange={setField('place')}
              list="g-place-list"
              aria-invalid={errors.place ? 'true' : undefined}
              aria-describedby={errors.place ? 'g-place-err' : 'g-place-hint'} />
            <datalist id="g-place-list">
              {placeOptions.map((option) => (
                <option key={`${option.label}-${option.lat}-${option.lon}`} value={option.label} />
              ))}
            </datalist>
            {errors.place && <p className="field-err mono" id="g-place-err">{errors.place}</p>}
            {!errors.place && values.place && !values.lat && !values.lon && (
              <p className="field-err mono" id="g-place-hint">select one of the suggested places</p>
            )}
          </div>
          <div className="continue-action">
            <button type="submit" className="continue-inline" disabled={!canGenerate || chartLoading}>
              {chartLoading ? 'generating…' : 'CONTINUE'}
            </button>
          </div>
        </div>

        {chartError && <div className="gen-alert mono">{chartError}</div>}
      </form>
    </div>
  )

  return (
    <section className="hero" id="chart" aria-label="Birth chart generator">
      <Dither />
      <div className="hero-left">
        {viewMode === 'form' && renderFormView()}
        {viewMode === 'chart' && (
          <ChartView chartSvg={chartSvg} chartLoading={chartLoading} chartError={chartError} chartLoaded={chartLoaded} onCustomize={handleCustomize} />
        )}
        {viewMode === 'customize' && (
          <CustomizePanel settings={wheelConfig} onUpdateSettings={handleSettingsUpdate} onBack={handleBackToChart} />
        )}
      </div>

      <div className="hero-right" ref={rightRef}>
        <div className="blob b1"></div><div className="blob b2"></div>
        <div className="print-frame">
          {chartSvg ? (
            <div className="chart-output" dangerouslySetInnerHTML={{ __html: chartSvg }} />
          ) : (
            <div className="chart-placeholder">the wheel appears here after you generate it</div>
          )}
          {chartLoaded && (
            <a className="btn poster-btn" href="/shop">Get this as a print-quality poster →</a>
          )}
        </div>
      </div>
    </section>
  )
}
