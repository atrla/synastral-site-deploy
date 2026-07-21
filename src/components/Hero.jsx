import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import Dither from './Dither.jsx'
import ChartView from './ChartView.jsx'
import CustomisePanel from './CustomisePanel.jsx'
import ResultUpsell from './ResultUpsell.jsx'
import PlaceCombobox from './PlaceCombobox.jsx'
import { useChartApi } from '../hooks/useChartApi.js'
import {
  INITIAL_PLACE_SELECTION_STATE,
  normalizePlaceOption,
  placeSelectionReducer,
  prioritisePlaceOptions,
} from '../utils/placeOptions.js'
import { buildDefaultWheelConfig } from '../utils/chartDefaults.js'
import { formatBirthTime } from '../utils/birthTime.js'
import { sanitizeFileStem } from '../utils/files.js'
import { exportChart } from '../utils/exportChart.js'
import { track } from '../utils/track.js'
import { parseShareParams, splitTime24 } from '../utils/shareParams.js'
import '../styles/hero.css'

const FIELD_ERRORS = {
  date: 'enter a date of birth',
  time: 'enter a time of birth',
  place: 'select a place of birth',
}

const DEFAULT_MERIDIEM = 'AM'

const DEFAULT_CHART_OPTIONS = {
  house_system: 'placidus',
  include_minor_aspects: false,
}

const DEFAULT_VISUAL_SETTINGS = {
  theme: 'ink',
  background: 'white',
  line_width: 1.5,
  glyph_size: 16,
  font_size: 11,
  show_placements: true,
  show_aspects: true,
}

const RESET_TRANSITION_MS = 260
const STAGE_TRANSITION_MS = 360
const SUBMIT_LOADING_MS = 3000
const RATE_LIMIT_COOLDOWN_MS = 5000
const RATE_LIMIT_MESSAGE = "you're customising quickly — give it a moment ~"
const TIME_INPUT_RE = /^(\d{1,2}):(\d{2})$/

function parseBirthTimeInput(time) {
  const match = TIME_INPUT_RE.exec(String(time || '').trim())
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null

  return { hour: String(hour), minute: String(minute).padStart(2, '0') }
}

function getChangedPatch(base, draft) {
  return Object.keys(draft).reduce((patch, key) => {
    if (base[key] !== draft[key]) patch[key] = draft[key]
    return patch
  }, {})
}

function hasObjectChanges(base, draft) {
  return Object.keys(draft).some((key) => base[key] !== draft[key])
}

function resolveVisualPulseGroup(patch) {
  if ('show_placements' in patch) return 'placements'
  if ('show_aspects' in patch) return 'aspects'
  if ('line_width' in patch) return 'lines'
  if ('glyph_size' in patch) return 'glyphs'
  if ('font_size' in patch) return 'text'
  return 'surface'
}

export default function Hero() {
  const { generateChart: apiGenerateChart, fetchPlaceOptions } = useChartApi()
  const heroRef = useRef(null)
  const genRef = useRef(null)
  const printChartRef = useRef(null)
  const dateRef = useRef(null)
  const timeRef = useRef(null)
  const timeMeridiemRef = useRef(null)
  const placeRef = useRef(null)
  const submitLoadingTimerRef = useRef(null)

  const [values, setValues] = useState({ date: '', time: '', timeMeridiem: DEFAULT_MERIDIEM })
  const [placeState, dispatchPlace] = useReducer(placeSelectionReducer, INITIAL_PLACE_SELECTION_STATE)
  const [errors, setErrors] = useState({})
  const [placeOptions, setPlaceOptions] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [wheelConfig, setWheelConfig] = useState(() => buildDefaultWheelConfig())
  const [wheelDraftConfig, setWheelDraftConfig] = useState(() => buildDefaultWheelConfig())
  const [chartOptions, setChartOptions] = useState(DEFAULT_CHART_OPTIONS)
  const [chartDraftOptions, setChartDraftOptions] = useState(DEFAULT_CHART_OPTIONS)
  const [chartSvg, setChartSvg] = useState('')
  // Raw chart_data from the generate response (houses/placements/aspects).
  // Not consumed by any UI yet — reserved for a future accessible text
  // summary or tabular data view of the chart.
  const [chartData, setChartData] = useState(null)
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
  const [submitLoading, setSubmitLoading] = useState(false)

  const requestSeq = useRef(0)
  const rateLimitedUntilRef = useRef(0)
  const stageTimerRef = useRef(null)
  const resetTimerRef = useRef(null)
  const shareAutoGenRef = useRef(false)
  const [pendingShareGenerate, setPendingShareGenerate] = useState(false)

  const onGenMove = (e) => {
    const gen = genRef.current
    if (!gen) return
    const r = gen.getBoundingClientRect()
    gen.style.setProperty('--mx', `${e.clientX - r.left}px`)
    gen.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const setField = (key) => (e) => {
    setValues({ ...values, [key]: e.target.value })
  }

  const handlePlaceTextChange = (text) => {
    dispatchPlace({ type: 'CHANGE_TEXT', text })
  }

  const handlePlaceSelect = (option) => {
    dispatchPlace({ type: 'SELECT', option })
  }

  const validateRequired = () => {
    const next = {}
    if (!values.date.trim()) next.date = FIELD_ERRORS.date
    if (!parseBirthTimeInput(values.time)) next.time = FIELD_ERRORS.time
    if (!placeState.place.trim() || placeState.selectedPlace === null) next.place = FIELD_ERRORS.place
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const parsedBirthTime = parseBirthTimeInput(values.time)
  const birthTime = parsedBirthTime
    ? formatBirthTime({ hour: parsedBirthTime.hour, minute: parsedBirthTime.minute, meridiem: values.timeMeridiem })
    : ''
  const canGenerate = Boolean(values.date.trim() && birthTime && placeState.selectedPlace)

  const missingFields = []
  if (!values.date.trim()) missingFields.push('date')
  if (!parsedBirthTime) missingFields.push('time')
  if (!placeState.place.trim() || placeState.selectedPlace === null) missingFields.push('place')
  const continueHint = missingFields.length ? `add ${missingFields.join(', ')} to continue` : ''

  const generateChart = useCallback(async ({ force = false, wheelConfigOverride, chartOptionsOverride } = {}) => {
    if (!canGenerate) return false
    if (!force && !chartLoaded) return false

    const configForRequest = wheelConfigOverride || wheelConfig
    const optionsForRequest = chartOptionsOverride || chartOptions

    const seq = ++requestSeq.current
    setChartLoading(true)
    setChartError('')

    try {
      const body = {
        birth_date: values.date,
        birth_time: birthTime,
        birth_lat: placeState.selectedPlace.lat,
        birth_lon: placeState.selectedPlace.lon,
        house_system: optionsForRequest.house_system,
        include_minor_aspects: optionsForRequest.include_minor_aspects,
        wheel_config: configForRequest,
      }
      const result = await apiGenerateChart(body)

      if (seq !== requestSeq.current) return false

      if (result.status === 'rate-limited') {
        setChartError(RATE_LIMIT_MESSAGE)
        rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return false
      }

      if (result.status === 'error') {
        setChartError(result.message)
        return false
      }

      // The real chart-api response is `{ chart_data, svg }` — there is no
      // `wheel_config` field. Chart rendering is stateless/deterministic (the
      // server renders exactly what was sent), so the client-held wheelConfig/
      // chartOptions state is already authoritative and needs no merge back.
      // `result.svg` is already sanitised (useChartApi.js) before it reaches us.
      setChartSvg(result.svg)
      setChartError('')
      setChartLoaded(true)
      // chart_data (houses/placements/aspects) isn't consumed by any UI yet,
      // but we keep it around for a future accessible text summary or data
      // table view of the chart.
      setChartData(result.chartData)
      return true
    } catch {
      if (seq !== requestSeq.current) return false
      track('chart_error', { error_class: 'network_error' })
      setChartError('couldn\'t reach the generator, try again')
      return false
    } finally {
      if (seq === requestSeq.current) setChartLoading(false)
    }
  }, [apiGenerateChart, birthTime, canGenerate, chartLoaded, values.date, placeState.selectedPlace, wheelConfig, chartOptions])

  useEffect(() => {
    if (placeState.place.trim().length < 2) {
      setPlaceOptions([])
      setPlacesLoading(false)
      return
    }

    const query = placeState.place.trim()
    const handle = window.setTimeout(async () => {
      setPlacesLoading(true)
      try {
        const data = await fetchPlaceOptions(query)
        if (placeState.place.trim() === query) {
          const normalizedOptions = data.map(normalizePlaceOption)
          setPlaceOptions(prioritisePlaceOptions(normalizedOptions, query))
        }
      } catch {
        setPlaceOptions([])
      } finally {
        setPlacesLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [fetchPlaceOptions, placeState.place])

  const triggerPreviewPulse = useCallback((group) => {
    setPreviewPulseGroup(group || 'frame')
    setPreviewPulseNonce((current) => current + 1)
  }, [])

  const handleSettingsUpdate = (patch) => {
    setWheelDraftConfig((current) => ({ ...current, ...patch }))
  }

  const handleChartOptionsUpdate = (patch) => {
    setChartDraftOptions((current) => ({ ...current, ...patch }))
  }

  const handleVisualSettingsUpdate = (patch) => {
    setVisualDraftSettings((current) => ({ ...current, ...patch }))
  }

  const handleApplyChanges = useCallback(async () => {
    const wheelPatch = getChangedPatch(wheelConfig, wheelDraftConfig)
    const chartOptionsPatch = getChangedPatch(chartOptions, chartDraftOptions)
    const visualPatch = getChangedPatch(visualSettings, visualDraftSettings)

    const hasWheelChanges = Object.keys(wheelPatch).length > 0
    const hasChartOptionChanges = Object.keys(chartOptionsPatch).length > 0
    const hasVisualChanges = Object.keys(visualPatch).length > 0

    if (!hasWheelChanges && !hasChartOptionChanges && !hasVisualChanges) return

    const nextWheelConfig = hasWheelChanges ? { ...wheelConfig, ...wheelPatch } : wheelConfig
    const nextChartOptions = hasChartOptionChanges ? { ...chartOptions, ...chartOptionsPatch } : chartOptions
    const nextVisualSettings = hasVisualChanges ? { ...visualSettings, ...visualPatch } : visualSettings
    const pulseGroup = hasVisualChanges ? resolveVisualPulseGroup(visualPatch) : hasChartOptionChanges ? 'aspects' : 'frame'

    if (hasWheelChanges) setWheelConfig(nextWheelConfig)
    if (hasChartOptionChanges) setChartOptions(nextChartOptions)
    if (hasVisualChanges) setVisualSettings(nextVisualSettings)

    triggerPreviewPulse(pulseGroup)

    if ((hasWheelChanges || hasChartOptionChanges) && chartLoaded && canGenerate) {
      await generateChart({ force: true, wheelConfigOverride: nextWheelConfig, chartOptionsOverride: nextChartOptions })
    }
  }, [
    wheelConfig,
    wheelDraftConfig,
    chartOptions,
    chartDraftOptions,
    visualSettings,
    visualDraftSettings,
    triggerPreviewPulse,
    chartLoaded,
    canGenerate,
    generateChart,
  ])

  useEffect(() => () => {
    if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current)
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    if (submitLoadingTimerRef.current) window.clearTimeout(submitLoadingTimerRef.current)
  }, [])

  // WP-3.3 share loop, step 1: on first mount only, look for a share link's
  // query params (?d=&t=&lat=&lon=&place=). Invalid or partial params are
  // ignored silently — this is a convenience prefill, never a required
  // flow. A valid link prefills the form and hands off to the effect below,
  // which fires the actual (single) auto-generate once that state lands.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (shareAutoGenRef.current) return
    shareAutoGenRef.current = true

    const parsed = parseShareParams(window.location.search)
    if (!parsed) return

    const split = splitTime24(parsed.time)
    if (!split) return

    track('chart_link_opened')
    setValues({ date: parsed.date, time: `${split.hour.padStart(2, '0')}:${split.minute}`, timeMeridiem: split.meridiem })
    dispatchPlace({ type: 'SELECT', option: { label: parsed.place, lat: parsed.lat, lon: parsed.lon } })
    setPendingShareGenerate(true)
  }, [])

  // WP-3.3 share loop, step 2: fires once the prefilled values/place from
  // the effect above are actually reflected in state and pass the same
  // `canGenerate` gate the manual "continue" button uses. Rate-limit
  // awareness (COMMON CONTEXT rule 9): this is the single auto-generate
  // call for a shared link — `pendingShareGenerate` is cleared before the
  // request fires, so nothing here can re-arm it, and a 429 surfaces
  // through `generateChart`'s existing RATE_LIMIT_MESSAGE path rather than
  // a separate error UI or a retry.
  useEffect(() => {
    if (!pendingShareGenerate || !canGenerate) return
    setPendingShareGenerate(false)

    let cancelled = false
    generateChart({ force: true }).then((success) => {
      if (cancelled || !success) return
      setResultEntered(false)
      setViewMode('generating')
      if (stageTimerRef.current) window.clearTimeout(stageTimerRef.current)
      stageTimerRef.current = window.setTimeout(() => {
        setViewMode('result')
        setResultEntered(true)
        stageTimerRef.current = null
      }, STAGE_TRANSITION_MS)
    })

    return () => { cancelled = true }
  }, [pendingShareGenerate, canGenerate, generateChart])

  const resetExperience = useCallback(({ preserveValues = true } = {}) => {
    requestSeq.current += 1
    rateLimitedUntilRef.current = 0

    if (stageTimerRef.current) {
      window.clearTimeout(stageTimerRef.current)
      stageTimerRef.current = null
    }

    setErrors({})
    setPlaceOptions([])
    setPlacesLoading(false)
    setWheelConfig(buildDefaultWheelConfig())
    setWheelDraftConfig(buildDefaultWheelConfig())
    setChartOptions(DEFAULT_CHART_OPTIONS)
    setChartDraftOptions(DEFAULT_CHART_OPTIONS)
    setChartSvg('')
    setChartData(null)
    setChartError('')
    setChartLoading(false)
    setChartLoaded(false)
    setResultEntered(false)
    setPreviewPulseGroup('')
    setPreviewPulseNonce(0)
    setVisualDraftSettings(DEFAULT_VISUAL_SETTINGS)
    setVisualSettings(DEFAULT_VISUAL_SETTINGS)
    setSubmitLoading(false)

    if (submitLoadingTimerRef.current) {
      window.clearTimeout(submitLoadingTimerRef.current)
      submitLoadingTimerRef.current = null
    }

    if (!preserveValues) {
      setValues({ date: '', time: '', timeMeridiem: DEFAULT_MERIDIEM })
      dispatchPlace({ type: 'RESET' })
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
        : !values.time.trim()
          ? timeRef
          : !parseBirthTimeInput(values.time)
            ? timeRef
            : !values.timeMeridiem.trim()
              ? timeMeridiemRef
              : !placeState.place.trim() || placeState.selectedPlace === null
                  ? placeRef
                  : timeRef
      firstBad.current?.focus()
      return
    }

    setSubmitLoading(true)
    setResultEntered(false)
    setViewMode('generating')

    if (submitLoadingTimerRef.current) {
      window.clearTimeout(submitLoadingTimerRef.current)
      submitLoadingTimerRef.current = null
    }

    const loadingDelay = new Promise((resolve) => {
      submitLoadingTimerRef.current = window.setTimeout(() => {
        submitLoadingTimerRef.current = null
        resolve()
      }, SUBMIT_LOADING_MS)
    })

    const [success] = await Promise.all([
      generateChart({ force: true }),
      loadingDelay,
    ])

    setSubmitLoading(false)

    if (success) {
      setViewMode('result')
      setResultEntered(true)
    } else {
      setViewMode('input')
    }
  }

  const handleCustomise = () => {
    track('customise_opened')
    setViewMode('customising')
  }

  const handleCloseCustomise = () => {
    setViewMode('result')
  }

  const handleExportChart = useCallback(async () => {
    const chartOutput = printChartRef.current
    const svgElement = chartOutput?.querySelector('svg')
    if (!svgElement) return

    const fileStem = sanitizeFileStem(values.date)
    await exportChart({ svgElement, visualSettings, wheelConfig, fileStem })
    track('chart_exported')
  }, [values.date, visualSettings, wheelConfig])

  const renderHeroCopy = () => (
    <div className="hero-intro hero-copy-block">
      <div className="hero-title">
      <div className="eyebrow mono">01 &mdash; synastral / astrology by kate<span className="caret">&#9608;</span></div>
      <h1>
        <span className="strong">create your </span>
        <span className="line">birth chart!</span>
      </h1>
      <p className="tag">Use this free astrology calculator to generate a birth chart featuring your unique houses, aspects, and placements. customise colours, backgrounds, and details.</p>
      </div>
    </div>
  )

  const renderInputForm = (className = '') => {
    return (
      <form className={`gen${className ? ` ${className}` : ''}`} id="chart-form" tabIndex={-1} ref={genRef} onPointerMove={onGenMove} onSubmit={handleContinue} noValidate>
        {submitLoading ? (
          <div className="gen-loading" aria-live="polite" role="status">
            <div className="gen-spinner" aria-hidden="true"></div>
            <span className="mono">casting your chart...</span>
          </div>
        ) : (
          <>
            <div className="gen-head">
              <span className="t">generate your birth chart</span>
              <span className="free mono">free, no account needed ~</span>
            </div>

            <div className="birth-inputs">
              <div>
                <label htmlFor="g-date">date of birth</label>
                <input
                  id="g-date"
                  name="birth-date"
                  type="date"
                  autoComplete="bday"
                  required
                  ref={dateRef}
                  value={values.date}
                  onChange={setField('date')}
                  aria-invalid={errors.date ? 'true' : undefined}
                  aria-describedby={errors.date ? 'g-date-err' : undefined}
                />
                {errors.date && <p className="field-err mono" id="g-date-err">{errors.date}</p>}
              </div>

              <div className="birth-time-field">
                <div className="time-group-label">time of birth</div>
                <div className="time-inputs" aria-describedby={errors.time ? 'g-time-err' : undefined}>
                  <label className="time-field time-field-time" htmlFor="g-time">
                    <span className="time-sub-label">time of birth</span>
                    <input
                      id="g-time"
                      name="birth-time"
                      type="text"
                      inputMode="numeric"
                      pattern={"\\d{1,2}:\\d{2}"}
                      placeholder="HH:MM"
                      required
                      ref={timeRef}
                      value={values.time}
                      onChange={setField('time')}
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
                <PlaceCombobox
                  id="g-place"
                  inputRef={placeRef}
                  value={placeState.place}
                  onValueChange={handlePlaceTextChange}
                  options={placeOptions}
                  loading={placesLoading}
                  selected={placeState.selectedPlace}
                  onSelect={handlePlaceSelect}
                  placeholder="city, country"
                  autoComplete="off"
                  invalid={Boolean(errors.place)}
                  describedBy={errors.place ? 'g-place-err' : 'g-place-hint'}
                />
                {errors.place && <p className="field-err mono" id="g-place-err">{errors.place}</p>}
                {!errors.place && placeState.place && placeState.selectedPlace === null && (
                  <p className="field-err mono" id="g-place-hint">select one of the suggested places</p>
                )}
              </div>

              <div className="continue-action">
                <button type="submit" className="btn-ghost" data-submit-btn disabled={!canGenerate || chartLoading || submitLoading}>
                  {chartLoading ? 'generating…' : 'continue'}
                </button>
                <span className="form-hint mono" data-form-hint>{continueHint}</span>
              </div>
            </div>
          </>
        )}

        {chartError && <div className="gen-alert mono">{chartError}</div>}
      </form>
    )
  }

  const outputClassName = `chart-output theme-${visualSettings.theme} bg-${visualSettings.background} ${visualSettings.show_placements ? 'show-placements' : 'hide-placements'} ${visualSettings.show_aspects ? 'show-aspects' : 'hide-aspects'}`
  const outputStyle = {
    '--chart-line-width': visualSettings.line_width,
    '--chart-glyph-size': visualSettings.glyph_size,
    '--chart-font-size': visualSettings.font_size,
  }
  const hasPendingCustomiseChanges = hasObjectChanges(wheelConfig, wheelDraftConfig)
    || hasObjectChanges(chartOptions, chartDraftOptions)
    || hasObjectChanges(visualSettings, visualDraftSettings)

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
              settings={wheelDraftConfig}
              visualSettings={visualDraftSettings}
              chartOptions={chartDraftOptions}
              hasPendingChanges={hasPendingCustomiseChanges}
              onUpdateSettings={handleSettingsUpdate}
              onUpdateVisualSettings={handleVisualSettingsUpdate}
              onUpdateChartOptions={handleChartOptionsUpdate}
              onApplyChanges={handleApplyChanges}
              onClose={handleCloseCustomise}
              onReturnToInput={handleReturnToInput}
            />
            </div>
            <ResultUpsell />
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
                  dangerouslySetInnerHTML={{ __html: chartSvg }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
