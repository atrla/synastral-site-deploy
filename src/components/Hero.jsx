import { useCallback, useEffect, useRef, useState } from 'react'
import Dither from './Dither.jsx'
import ChartView from './ChartView.jsx'
import CustomisePanel from './CustomisePanel.jsx'
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

const DEFAULT_VISUAL_SETTINGS = {
  theme: 'ink',
  background: 'transparent',
  line_width: 1.5,
  glyph_size: 16,
  font_size: 11,
  show_placements: true,
  show_aspects: true,
  export_format: 'png',
  export_resolution: '1x',
}

const RESET_TRANSITION_MS = 260

export default function Hero() {
  const heroRef = useRef(null)
  const rightRef = useRef(null)
  const genRef = useRef(null)
  const titleRef = useRef(null)
  const skyRef = useRef(null)
  const ditherRef = useRef(null)
  const circleWrapRef = useRef(null)
  const circleRef = useRef(null)
  const printChartRef = useRef(null)
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
  const [viewMode, setViewMode] = useState('input')
  const [resultEntered, setResultEntered] = useState(false)
  const [returningToInput, setReturningToInput] = useState(false)
  const [visualDraftSettings, setVisualDraftSettings] = useState(DEFAULT_VISUAL_SETTINGS)
  const [visualSettings, setVisualSettings] = useState(DEFAULT_VISUAL_SETTINGS)
  const [previewPulseGroup, setPreviewPulseGroup] = useState('')
  const [previewPulseNonce, setPreviewPulseNonce] = useState(0)

  const requestSeq = useRef(0)
  const visualDebounceRef = useRef(null)
  const visualPatchRef = useRef({})
  const visualPulseRef = useRef('frame')
  const chartDebounceRef = useRef(null)
  const flipFirstRectRef = useRef(null)
  const activeTransitionRef = useRef({ animations: [], safetyTimer: null })
  const resetTimerRef = useRef(null)

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

  const generateChart = useCallback(async ({ force = false, wheelConfigOverride } = {}) => {
    if (!canGenerate) return false
    if (!force && !chartLoaded) return false

    const configForRequest = wheelConfigOverride || wheelConfig

    const seq = ++requestSeq.current
    setChartLoading(true)
    setChartError('')

    try {
      const body = {
        birth_date: values.date,
        birth_time: values.time,
        birth_lat: Number(values.lat),
        birth_lon: Number(values.lon),
        wheel_config: configForRequest,
      }
      const response = await fetch(buildApiUrl('api/chart/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (seq !== requestSeq.current) return false

      const payload = await response.json()
      if (!response.ok) {
        setChartError(payload.detail || 'couldn\'t generate chart \u2014 check your inputs')
        return false
      }

      const nextConfig = {
        ...buildDefaultWheelConfig(),
        ...configForRequest,
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

  const triggerPreviewPulse = useCallback((group) => {
    setPreviewPulseGroup(group || 'frame')
    setPreviewPulseNonce((current) => current + 1)
  }, [])

  const scheduleChartRefresh = useCallback((pulseGroup = 'aspects', nextWheelConfig = null) => {
    if (chartDebounceRef.current) window.clearTimeout(chartDebounceRef.current)
    chartDebounceRef.current = window.setTimeout(() => {
      if (!chartLoaded || !canGenerate) return
      triggerPreviewPulse(pulseGroup)
      generateChart({ wheelConfigOverride: nextWheelConfig || undefined })
    }, 200)
  }, [canGenerate, chartLoaded, generateChart, triggerPreviewPulse])

  const handleSettingsUpdate = (patch, options = {}) => {
    let nextWheelConfig = null
    setWheelConfig((current) => {
      nextWheelConfig = { ...current, ...patch }
      return nextWheelConfig
    })
    if (options.shouldGenerate) {
      scheduleChartRefresh(options.pulseGroup || 'aspects', nextWheelConfig)
    }
  }

  const handleVisualSettingsUpdate = (patch, options = {}) => {
    setVisualDraftSettings((current) => ({ ...current, ...patch }))
    visualPatchRef.current = { ...visualPatchRef.current, ...patch }
    visualPulseRef.current = options.pulseGroup || visualPulseRef.current || 'frame'

    if (visualDebounceRef.current) window.clearTimeout(visualDebounceRef.current)
    visualDebounceRef.current = window.setTimeout(() => {
      const mergedPatch = visualPatchRef.current
      visualPatchRef.current = {}
      setVisualSettings((current) => ({ ...current, ...mergedPatch }))
      triggerPreviewPulse(visualPulseRef.current)
      visualPulseRef.current = 'frame'
    }, 200)
  }

  useEffect(() => () => {
    if (visualDebounceRef.current) window.clearTimeout(visualDebounceRef.current)
    if (chartDebounceRef.current) window.clearTimeout(chartDebounceRef.current)
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
  }, [])

  const playCinematicTransition = useCallback(() => {
    if (viewMode !== 'generating') return

    const first = flipFirstRectRef.current
    const gen = genRef.current
    const sky = skyRef.current
    const dither = ditherRef.current
    const title = titleRef.current
    const circleWrap = circleWrapRef.current
    const circle = circleRef.current
    const printChart = printChartRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const finish = () => {
      const { safetyTimer } = activeTransitionRef.current
      if (safetyTimer) window.clearTimeout(safetyTimer)
      activeTransitionRef.current = { animations: [], safetyTimer: null }
      flipFirstRectRef.current = null
      setViewMode('result')
      setResultEntered(true)
    }

    if (reducedMotion || !gen?.animate) {
      finish()
      return
    }

    const EASE_CORE = 'cubic-bezier(0.4, 0, 0.2, 1)'

    const animations = []
    const addAnimation = (el, frames, options) => {
      if (!el?.animate) return null
      const animation = el.animate(frames, { fill: 'both', ...options })
      animations.push(animation)
      return animation
    }

    // Cinematic reveal timeline (1500 ms total):
    // 0-300 ms: form container scales to 0.95 and fades slightly
    // 300-900 ms: background transitions dark/star field -> light/dither
    // 400-1200 ms: circular outline draw animation appears on chart side
    // 800-1400 ms: form transforms into compact left-side edit panel position
    // 1000-1500 ms: chart fades/scales in and replaces outline

    addAnimation(sky, [
      { opacity: 0.92 },
      { opacity: 0.92, offset: 0.2 },
      { opacity: 0, offset: 0.6 },
      { opacity: 0, offset: 1 },
    ], { duration: 1500, easing: 'ease-in-out' })

    addAnimation(dither, [
      { opacity: 0.08 },
      { opacity: 0.08, offset: 0.2 },
      { opacity: 0.34, offset: 0.6 },
      { opacity: 0.34, offset: 1 },
    ], { duration: 1500, easing: 'ease-in-out' })

    addAnimation(title, [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-20px)' },
    ], { duration: 600, easing: EASE_CORE })

    if (first) {
      const last = gen.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      const sx = first.width / Math.max(last.width, 1)
      const sy = first.height / Math.max(last.height, 1)
      gen.style.transformOrigin = 'top left'
      addAnimation(gen, [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx * 0.95}, ${sy * 0.95})`, opacity: 0.88, offset: 0.2 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx * 0.95}, ${sy * 0.95})`, opacity: 0.88, offset: 8 / 15 },
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, offset: 14 / 15 },
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
      ], { duration: 1500, easing: EASE_CORE })
    }

    addAnimation(circleWrap, [
      { opacity: 0, transform: 'translateY(10px) scale(0.96)' },
      { opacity: 0, transform: 'translateY(10px) scale(0.96)', offset: 4 / 15 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 / 3 },
      { opacity: 1, transform: 'translateY(0) scale(1)', offset: 4 / 5 },
      { opacity: 0, transform: 'translateY(-6px) scale(1.01)', offset: 1 },
    ], { duration: 1500, easing: EASE_CORE })

    addAnimation(circle, [
      { strokeDashoffset: 1 },
      { strokeDashoffset: 1, offset: 4 / 15 },
      { strokeDashoffset: 0, offset: 4 / 5 },
      { strokeDashoffset: 0, offset: 1 },
    ], { duration: 1500, easing: 'linear' })

    addAnimation(printChart, [
      { opacity: 0, transform: 'scale(0.985)' },
      { opacity: 0, transform: 'scale(0.985)', offset: 2 / 3 },
      { opacity: 1, transform: 'scale(1)', offset: 1 },
    ], { duration: 1500, easing: EASE_CORE })

    const longestAnimation = animations.reduce((longest, animation) => {
      const timing = animation.effect?.getTiming?.() || {}
      const duration = Number(timing.duration) || 0
      const delay = Number(timing.delay) || 0
      const currentTotal = duration + delay
      const longestTiming = longest.effect?.getTiming?.() || {}
      const longestTotal = (Number(longestTiming.duration) || 0) + (Number(longestTiming.delay) || 0)
      return currentTotal >= longestTotal ? animation : longest
    }, animations[0])

    let finished = false
    const finishOnce = () => {
      if (finished) return
      finished = true
      finish()
    }

    const safetyTimer = window.setTimeout(finishOnce, 1500)
    activeTransitionRef.current = { animations, safetyTimer }
    longestAnimation?.finished.then(finishOnce).catch(finishOnce)
  }, [viewMode])

  useEffect(() => {
    if (viewMode !== 'generating') return undefined
    const raf = window.requestAnimationFrame(playCinematicTransition)
    return () => window.cancelAnimationFrame(raf)
  }, [playCinematicTransition, viewMode])

  useEffect(() => () => {
    const { animations, safetyTimer } = activeTransitionRef.current
    animations.forEach((animation) => animation.cancel())
    if (safetyTimer) window.clearTimeout(safetyTimer)
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
  }, [])

  const resetExperience = useCallback(({ preserveValues = true } = {}) => {
    requestSeq.current += 1

    if (visualDebounceRef.current) {
      window.clearTimeout(visualDebounceRef.current)
      visualDebounceRef.current = null
    }

    if (chartDebounceRef.current) {
      window.clearTimeout(chartDebounceRef.current)
      chartDebounceRef.current = null
    }

    const { animations, safetyTimer } = activeTransitionRef.current
    animations.forEach((animation) => animation.cancel())
    if (safetyTimer) window.clearTimeout(safetyTimer)
    activeTransitionRef.current = { animations: [], safetyTimer: null }

    visualPatchRef.current = {}
    visualPulseRef.current = 'frame'
    flipFirstRectRef.current = null

    setErrors({})
    setPlaceOptions([])
    setPlacesLoading(false)
    setWheelConfig(buildDefaultWheelConfig())
    setChartSvg('')
    setChartError('')
    setChartLoading(false)
    setChartLoaded(false)
    setResultEntered(false)
    setPreviewPulseGroup('')
    setPreviewPulseNonce(0)
    setVisualDraftSettings(DEFAULT_VISUAL_SETTINGS)
    setVisualSettings(DEFAULT_VISUAL_SETTINGS)

    if (!preserveValues) {
      setValues({ date: '', time: '', place: '', lat: '', lon: '' })
    }
  }, [])

  const handleReturnToInput = useCallback(() => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)

    setReturningToInput(true)
    setResultEntered(false)

    resetTimerRef.current = window.setTimeout(() => {
      resetExperience({ preserveValues: true })
      setViewMode('input')
      setReturningToInput(false)
      resetTimerRef.current = null
      window.requestAnimationFrame(() => dateRef.current?.focus())
    }, RESET_TRANSITION_MS)
  }, [resetExperience])

  const handleContinue = async (e) => {
    e.preventDefault()
    const valid = validateRequired()
    if (!valid) {
      const firstBad = !values.date.trim() ? dateRef : !values.time.trim() ? timeRef : placeRef
      firstBad.current?.focus()
      return
    }

    const success = await generateChart({ force: true })
    if (success) {
      flipFirstRectRef.current = genRef.current?.getBoundingClientRect() || null
      setResultEntered(false)
      setViewMode('generating')
    }
  }

  const handleCustomise = () => {
    setViewMode('customising')
  }

  const handleCloseCustomise = () => {
    setViewMode('result')
  }

  const renderFormView = () => (
    <div className="hero-intro">
      <div className="hero-title" ref={titleRef}>
      <div className="eyebrow mono">01 &mdash; synastral / astrology by kate<span className="caret">&#9608;</span></div>
      <h1>
        <span className="line">your <span className="strong">birth chart,</span></span>
        <span className="line"><span className="ser">free &amp;</span></span>
        <span className="line"><span className="strong">no strings.</span></span>
      </h1>
      <p className="tag">Enter the moment you were born, get your full natal wheel in the <b>Synastral house style</b> &mdash; houses, aspects, placements. Right here, right now.</p>

      </div>

      <form className="gen" id="chart-form" tabIndex={-1} ref={genRef} onPointerMove={onGenMove} onSubmit={handleContinue} noValidate>
        <div className="gen-head">
          <span className="t">&#10035; generate your chart</span>
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
              {chartLoading ? 'generating\u2026' : 'CONTINUE'}
            </button>
          </div>
        </div>

        {chartError && <div className="gen-alert mono">{chartError}</div>}
      </form>
    </div>
  )

  const renderGeneratingView = () => (
    <div className="hero-intro">
      <div className="hero-title" ref={titleRef}>
        <div className="eyebrow mono">01 &mdash; synastral / astrology by kate<span className="caret">&#9608;</span></div>
        <h1>
          <span className="line">your <span className="strong">birth chart,</span></span>
          <span className="line"><span className="ser">free &amp;</span></span>
          <span className="line"><span className="strong">no strings.</span></span>
        </h1>
        <p className="tag">Enter the moment you were born, get your full natal wheel in the <b>Synastral house style</b> &mdash; houses, aspects, placements. Right here, right now.</p>
      </div>

      <ChartView
        chartSvg={chartSvg}
        chartLoading={chartLoading}
        chartError={chartError}
        chartLoaded={chartLoaded}
        onCustomise={handleCustomise}
        onReturnToInput={handleReturnToInput}
        panelRef={genRef}
        outputClassName={outputClassName}
        outputStyle={outputStyle}
        pulseGroup={previewPulseGroup}
        pulseNonce={previewPulseNonce}
        showPlacements={visualSettings.show_placements}
        showAspects={visualSettings.show_aspects}
        exportFormat={visualSettings.export_format}
        exportResolution={visualSettings.export_resolution}
        showShimmer={Boolean(chartSvg) && chartLoading}
      />
    </div>
  )

  const outputClassName = `chart-output theme-${visualSettings.theme} bg-${visualSettings.background} ${visualSettings.show_placements ? 'show-placements' : 'hide-placements'} ${visualSettings.show_aspects ? 'show-aspects' : 'hide-aspects'}`
  const outputStyle = {
    '--chart-line-width': visualSettings.line_width,
    '--chart-glyph-size': visualSettings.glyph_size,
    '--chart-font-size': visualSettings.font_size,
  }

  return (
    <section
      className={`hero hero-${viewMode}${resultEntered ? ' result-entered' : ''}${viewMode === 'customising' ? ' hero-customise' : ''}${returningToInput ? ' hero-returning-input' : ''}`}
      id="chart"
      aria-label="Birth chart generator"
      ref={heroRef}
    >
      <div className="cinematic-sky" ref={skyRef} aria-hidden="true"></div>
      <div className="dither-shell" ref={ditherRef} aria-hidden="true">
        <Dither />
      </div>
      <div className="hero-left">
        {viewMode === 'input' && renderFormView()}
        {viewMode === 'generating' && renderGeneratingView()}
        {viewMode === 'result' && (
          <ChartView
            chartSvg={chartSvg}
            chartLoading={chartLoading}
            chartError={chartError}
            chartLoaded={chartLoaded}
            onCustomise={handleCustomise}
            onReturnToInput={handleReturnToInput}
            panelRef={genRef}
            outputClassName={outputClassName}
            outputStyle={outputStyle}
            pulseGroup={previewPulseGroup}
            pulseNonce={previewPulseNonce}
            showPlacements={visualSettings.show_placements}
            showAspects={visualSettings.show_aspects}
            exportFormat={visualSettings.export_format}
            exportResolution={visualSettings.export_resolution}
            showShimmer={Boolean(chartSvg) && chartLoading}
          />
        )}
        {viewMode === 'customising' && (
          <div className={`customise-shell${viewMode === 'customising' ? ' is-open' : ''}`}>
            <CustomisePanel
              settings={wheelConfig}
              visualSettings={visualDraftSettings}
              onUpdateSettings={handleSettingsUpdate}
              onUpdateVisualSettings={handleVisualSettingsUpdate}
              onClose={handleCloseCustomise}
              onReturnToInput={handleReturnToInput}
            />
          </div>
        )}
      </div>

      <div className="hero-right" ref={rightRef}>
        <div className="blob b1"></div><div className="blob b2"></div>
        <div className="print-frame">
          <svg className="foreshadow-circle" ref={circleWrapRef} viewBox="0 0 100 100" aria-hidden="true">
            <circle ref={circleRef} cx="50" cy="50" r="44" pathLength="1" />
          </svg>
          {chartSvg ? (
            <div className="chart-output-wrap">
              {chartLoading && <div className="chart-output-shimmer" aria-hidden="true" />}
              <div
                className={`${outputClassName} ${previewPulseGroup ? `pulse-${previewPulseGroup}` : ''}`}
                key={`print-preview-${previewPulseNonce}`}
                ref={printChartRef}
                style={outputStyle}
                data-show-placements={visualSettings.show_placements}
                data-show-aspects={visualSettings.show_aspects}
                data-export-format={visualSettings.export_format}
                data-export-resolution={visualSettings.export_resolution}
                dangerouslySetInnerHTML={{ __html: chartSvg }}
              />
            </div>
          ) : (
            <div className="chart-placeholder">the wheel appears here after you generate it</div>
          )}
          {chartLoaded && (
            <a className="poster-btn" href="/shop">Download print-ready poster &rarr;</a>
          )}
        </div>
      </div>
    </section>
  )
}
