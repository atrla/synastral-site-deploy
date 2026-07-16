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

const DEFAULT_MERIDIEM = 'AM'
const EXPORT_RESOLUTION_SCALE = {
  '1x': 1,
  '2x': 2,
  '3x': 3,
}

const sanitizeFileStem = (value) => {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned || 'synastral-chart'
}

const formatBirthTime = ({ hour, minute, meridiem }) => {
  const hourValue = Number(hour)
  const minuteValue = Number(minute)

  if (!hour || !minute || !meridiem) return ''
  if (!Number.isInteger(hourValue) || hourValue < 1 || hourValue > 12) return ''
  if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) return ''

  const hour24 = meridiem === 'PM'
    ? (hourValue % 12) + 12
    : hourValue % 12

  return `${String(hour24).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`
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
const STAGE_TRANSITION_MS = 360

export default function Hero() {
  const heroRef = useRef(null)
  const genRef = useRef(null)
  const printChartRef = useRef(null)
  const dateRef = useRef(null)
  const timeHourRef = useRef(null)
  const timeMinuteRef = useRef(null)
  const timeMeridiemRef = useRef(null)
  const placeRef = useRef(null)

  const [values, setValues] = useState({ date: '', timeHour: '', timeMinute: '', timeMeridiem: DEFAULT_MERIDIEM, place: '', lat: '', lon: '' })
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
  const stageTimerRef = useRef(null)
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
    if (!formatBirthTime({ hour: values.timeHour, minute: values.timeMinute, meridiem: values.timeMeridiem })) next.time = FIELD_ERRORS.time
    if (!values.place.trim() || !values.lat || !values.lon) next.place = FIELD_ERRORS.place
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const birthTime = formatBirthTime({ hour: values.timeHour, minute: values.timeMinute, meridiem: values.timeMeridiem })
  const canGenerate = Boolean(values.date && birthTime && values.lat && values.lon)

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
        birth_time: birthTime,
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
  }, [birthTime, canGenerate, chartLoaded, values.date, values.lat, values.lon, wheelConfig])

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
    if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current)
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

    if (stageTimerRef.current) {
      window.clearTimeout(stageTimerRef.current)
      stageTimerRef.current = null
    }

    visualPatchRef.current = {}
    visualPulseRef.current = 'frame'
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
      setValues({ date: '', timeHour: '', timeMinute: '', timeMeridiem: DEFAULT_MERIDIEM, place: '', lat: '', lon: '' })
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
      const firstBad = !values.date.trim()
        ? dateRef
        : !values.timeHour.trim()
          ? timeHourRef
          : !values.timeMinute.trim()
            ? timeMinuteRef
            : !values.timeMeridiem.trim()
              ? timeMeridiemRef
              : !formatBirthTime({ hour: values.timeHour, minute: values.timeMinute, meridiem: values.timeMeridiem })
                ? timeHourRef
                : !values.place.trim() || !values.lat || !values.lon
                  ? placeRef
                  : timeHourRef
      firstBad.current?.focus()
      return
    }

    const success = await generateChart({ force: true })
    if (success) {
      setResultEntered(false)
      setViewMode('generating')
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current)
      stageTimerRef.current = window.setTimeout(() => {
        setViewMode('result')
        setResultEntered(true)
        stageTimerRef.current = null
      }, STAGE_TRANSITION_MS)
    }
  }

  const handleCustomise = () => {
    setViewMode('customising')
  }

  const handleCloseCustomise = () => {
    setViewMode('result')
  }

  const handleExportChart = useCallback(async () => {
    const svgElement = printChartRef.current?.querySelector('svg')
    if (!svgElement) return

    const fileStem = sanitizeFileStem(values.date)
    const exportScale = EXPORT_RESOLUTION_SCALE['1x']

    const downloadBlob = (blob, extension) => {
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${fileStem}.${extension}`
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    }

    const serialized = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
    const objectUrl = URL.createObjectURL(svgBlob)

    try {
      const image = new Image()
      image.decoding = 'async'

      const imageLoaded = new Promise((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
      })

      image.src = objectUrl
      await imageLoaded

      const viewBox = svgElement.viewBox?.baseVal
      const baseWidth = viewBox?.width || svgElement.clientWidth || 1024
      const baseHeight = viewBox?.height || svgElement.clientHeight || 1024
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(baseWidth * exportScale))
      canvas.height = Math.max(1, Math.round(baseHeight * exportScale))

      const context = canvas.getContext('2d')
      if (!context) return

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (pngBlob) downloadBlob(pngBlob, 'png')
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }, [values.date])

  const renderHeroCopy = () => (
    <div className="hero-intro hero-copy-block">
      <div className="hero-title">
      <div className="eyebrow mono">01 &mdash; synastral / astrology by kate<span className="caret">&#9608;</span></div>
      <h1>
        <span className="strong">create your </span>
        <span className="line">birth chart!</span>
      </h1>
      <p className="tag">Use this free astrology calculator to generate a birth chart featuring your unique houses, aspects, and placements. Customise colors, backgrounds, and details.</p>
      </div>
    </div>
  )

  const renderInputForm = (className = '') => (
      <form className={`gen${className ? ` ${className}` : ''}`} id="chart-form" tabIndex={-1} ref={genRef} onPointerMove={onGenMove} onSubmit={handleContinue} noValidate>
        <div className="gen-head">
          <span className="t">generate your birth chart</span>
          <span className="free mono">free, no account needed ~</span>
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
          <div className="birth-time-field">
            <div className="time-group-label">time of birth</div>
            <div className="time-inputs" aria-describedby={errors.time ? 'g-time-err' : undefined}>
              <label className="time-field" htmlFor="g-time-hour">
                <span className="time-sub-label">hour</span>
                <input
                  id="g-time-hour"
                  name="birth-time-hour"
                  type="number"
                  min="1"
                  max="12"
                  inputMode="numeric"
                  required
                  ref={timeHourRef}
                  value={values.timeHour}
                  onChange={setField('timeHour')}
                  aria-invalid={errors.time ? 'true' : undefined}
                />
              </label>
              <label className="time-field" htmlFor="g-time-minute">
                <span className="time-sub-label">minute</span>
                <input
                  id="g-time-minute"
                  name="birth-time-minute"
                  type="number"
                  min="0"
                  max="59"
                  inputMode="numeric"
                  required
                  ref={timeMinuteRef}
                  value={values.timeMinute}
                  onChange={setField('timeMinute')}
                  aria-invalid={errors.time ? 'true' : undefined}
                />
              </label>
              <label className="time-field" htmlFor="g-time-meridiem">
                <span className="time-sub-label">am/pm</span>
                <select
                  id="g-time-meridiem"
                  name="birth-time-meridiem"
                  required
                  ref={timeMeridiemRef}
                  value={values.timeMeridiem}
                  onChange={setField('timeMeridiem')}
                  aria-invalid={errors.time ? 'true' : undefined}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </label>
            </div>
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
      <div className="cinematic-sky" aria-hidden="true"></div>
      <div className="dither-shell" aria-hidden="true">
        <Dither />
      </div>
      <div className="hero-left">
        {(viewMode === 'input' || viewMode === 'generating') && (
          <div className={viewMode === 'generating' ? 'stage-leaving-left' : ''}>
            {renderHeroCopy()}
          </div>
        )}

        {(viewMode === 'result' || viewMode === 'customising') && (
          <div className="stage-two-left">
            <ChartView
              chartSvg={chartSvg}
              chartLoading={chartLoading}
              chartError={chartError}
              chartLoaded={chartLoaded}
              onCustomise={handleCustomise}
              onReturnToInput={handleReturnToInput}
              onCloseCustomise={handleCloseCustomise}
              onExport={handleExportChart}
              isCustomiseOpen={viewMode === 'customising'}
              panelRef={genRef}
              outputClassName={outputClassName}
              outputStyle={outputStyle}
              pulseGroup={previewPulseGroup}
              pulseNonce={previewPulseNonce}
              showPlacements={visualSettings.show_placements}
              showAspects={visualSettings.show_aspects}
              showShimmer={Boolean(chartSvg) && chartLoading}
            />
            <div className={`customise-drop${viewMode === 'customising' ? ' is-open' : ''}`}>
            <CustomisePanel
              settings={wheelConfig}
              visualSettings={visualDraftSettings}
              onUpdateSettings={handleSettingsUpdate}
              onUpdateVisualSettings={handleVisualSettingsUpdate}
              onClose={handleCloseCustomise}
              onReturnToInput={handleReturnToInput}
            />
            </div>
          </div>
        )}
      </div>

      <div className="hero-right">
        {(viewMode === 'input' || viewMode === 'generating') && (
          <div className={viewMode === 'generating' ? 'stage-leaving-left' : ''}>
            {renderInputForm('stage-input-card')}
          </div>
        )}

        {(viewMode !== 'input' && chartSvg) && (
          <div className="chart-stage-enter">
            <div className="blob b1"></div><div className="blob b2"></div>
            <div className="print-frame">
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
              {chartLoaded && (
                <a className="poster-btn" href="/shop">Download print-ready poster &rarr;</a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
