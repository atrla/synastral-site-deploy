import { useEffect, useRef, useState } from 'react'
import Dither from './Dither.jsx'
import { normalizePlaceOption, resolvePlaceSelection } from '../utils/placeOptions.js'
import '../styles/hero.css'
import iris1000 from '../assets/08-iris-1000.webp?url'
import chartWheel640 from '../assets/03-chart-wheel-640.webp?url'
import chartWheel1280 from '../assets/03-chart-wheel-1280.webp?url'

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

const WHEEL_DEFAULTS = {
  aspects_shown: 'all',
  max_orb: 12.0,
  orb_fade: false,
  aspect_hub: true,
  conj_arcs: false,
  min_footprint: 0.0,
  glyph_scale: 1.0,
  text_scale: 1.0,
  line_scale: 1.0,
  band_width: 1.0,
  core_scale: 1.0,
  show_decans: true,
  show_tints: true,
  ink: '#0A3323',
  tint_fire: '#ECD8C6',
  tint_earth: '#DDE0BC',
  tint_air: '#F0E9C9',
  tint_water: '#DBDDE7',
  aspect_soft: '#839958',
  aspect_hard: '#8A94C8',
  aspect_conj: '#D3968C',
}

const PRESETS = {
  Classic: {},
  Airy: {
    orb_fade: true,
    max_orb: 6,
    aspect_hub: true,
    conj_arcs: true,
    min_footprint: 4,
    line_scale: 0.9,
  },
  Dense: {
    glyph_scale: 0.9,
    text_scale: 0.9,
  },
}

function EditorialStepper({ currentStep, onStepClick }) {
  const steps = [
    { num: 'I.', label: 'your birth', completed: currentStep > 1, active: currentStep === 1 },
    { num: 'II.', label: 'your sky', completed: currentStep > 2, active: currentStep === 2 },
    { num: 'III.', label: 'your colors', completed: currentStep === 3, active: currentStep === 3 },
  ]

  return (
    <div className="editorial-stepper">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`step-item ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
          onClick={() => step.completed && onStepClick(i + 1)}
        >
          <span className="step-num">{step.num}</span>
          <span className="step-label">{step.label}</span>
          {i < steps.length - 1 && <div className="step-divider">✦</div>}
        </div>
      ))}
    </div>
  )
}

function RuledSlider({ label, min, max, step, value, unit = '°', onChange }) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="ruled-slider">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="rule-track">
        <div className="rule-fill" style={{ width: `${percent}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input"
      />
      <div className="rule-labels">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function Hero() {
  const rightRef = useRef(null)
  const irisRef = useRef(null)
  const genRef = useRef(null)
  const dateRef = useRef(null)
  const timeRef = useRef(null)
  const placeRef = useRef(null)

  const [values, setValues] = useState({ date: '', time: '', place: '', lat: '', lon: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formCompleted, setFormCompleted] = useState(false)
  const [placeOptions, setPlaceOptions] = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [wheelConfig, setWheelConfig] = useState(WHEEL_DEFAULTS)
  const [chartSvg, setChartSvg] = useState('')
  const [chartError, setChartError] = useState('')
  const [chartLoading, setChartLoading] = useState(false)
  const [chartLoaded, setChartLoaded] = useState(false)

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

  const canGenerate = values.date && values.time && values.lat && values.lon

  const handleContinueToSky = () => {
    const valid = validateRequired()
    if (valid) {
      setFormCompleted(true)
      setCurrentStep(2)
    }
  }

  const generateChart = async ({ force = false } = {}) => {
    if (!canGenerate) return
    if (!force && !chartLoaded) return
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

      if (seq !== requestSeq.current) return

      const payload = await response.json()
      if (!response.ok) {
        setChartError(payload.detail || 'couldn\'t generate chart — check your inputs')
        return
      }

      setChartSvg(payload.svg || '')
      setChartError('')
      setChartLoaded(true)
      setWheelConfig({ ...WHEEL_DEFAULTS, ...payload.wheel_config })
    } catch (error) {
      if (seq !== requestSeq.current) return
      setChartError('couldn\'t reach the generator, try again')
    } finally {
      if (seq === requestSeq.current) setChartLoading(false)
    }
  }

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
      const timer = window.setTimeout(() => generateChart(), 300)
      return () => window.clearTimeout(timer)
    }
  }, [wheelConfig, chartLoaded, values.date, values.time, values.lat, values.lon])

  const updateWheelConfig = (key, value) => {
    setWheelConfig((current) => ({ ...current, [key]: value }))
    wheelChangeRef.current = true
  }

  const applyPreset = (preset) => {
    setWheelConfig((current) => ({ ...current, ...preset }))
    wheelChangeRef.current = true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const valid = validateRequired()
    if (!valid) {
      setSubmitted(false)
      const firstBad = errors.date ? dateRef : errors.time ? timeRef : placeRef
      firstBad.current?.focus()
      return
    }
    setSubmitted(true)
    await generateChart({ force: true })
  }

  const chartContent = chartLoaded ? (
    <div className="chart-svg" dangerouslySetInnerHTML={{ __html: chartSvg }} />
  ) : (
    <img
      src={chartWheel640}
      srcSet={`${chartWheel640} 640w, ${chartWheel1280} 1280w`}
      sizes="(min-width: 64em) 38vw, calc(100vw - 2rem)"
      width="640" height="640"
      alt="Example natal chart wheel with houses and aspects, Synastral house style"
      fetchpriority="high" decoding="async"
      style={{
        width: '100%',
        opacity: 0.2 + (formCompleted ? 0.3 : 0),
        transition: 'opacity 0.6s ease',
        filter: `saturate(${formCompleted ? 0.8 : 0.3})`,
      }}
      onError={(e) => { e.currentTarget.style.minHeight = '300px' }}
    />
  )

  return (
    <section className="hero" id="chart" aria-label="Birth chart generator">
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

          <EditorialStepper currentStep={currentStep} onStepClick={setCurrentStep} />

          <div className="step-panels">
            {currentStep === 1 && (
              <div className="step-panel" data-step="1">
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
                    <button type="button" className="continue-inline" onClick={handleContinueToSky} disabled={!canGenerate}>CONTINUE</button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step-panel" data-step="2">
                <div className="knob-row">
                  <span className="t">presets</span>
                  <div className="preset-buttons">
                    {Object.entries(PRESETS).map(([label, preset]) => (
                      <button key={label} type="button" className="chip" onClick={() => applyPreset(preset)}>{label}</button>
                    ))}
                  </div>
                </div>

                <div className="running-scroll" />

                <div className="knob-group">
                  <span className="t">aspects</span>
                  <RuledSlider
                    label="max orb"
                    min={1}
                    max={12}
                    step={0.5}
                    value={wheelConfig.max_orb}
                    onChange={(value) => updateWheelConfig('max_orb', value)}
                  />
                  <RuledSlider
                    label="min footprint"
                    min={0}
                    max={20}
                    step={0.5}
                    value={wheelConfig.min_footprint}
                    unit=""
                    onChange={(value) => updateWheelConfig('min_footprint', value)}
                  />
                  <div className="toggle-row">
                    <label className="circle-keyline-toggle">
                      <input type="checkbox" checked={wheelConfig.orb_fade} onChange={(e) => updateWheelConfig('orb_fade', e.target.checked)} />
                      <span className="circle-indicator" />
                      <span className="toggle-label">orb fade</span>
                    </label>
                    <label className="circle-keyline-toggle">
                      <input type="checkbox" checked={wheelConfig.aspect_hub} onChange={(e) => updateWheelConfig('aspect_hub', e.target.checked)} />
                      <span className="circle-indicator" />
                      <span className="toggle-label">aspect hub</span>
                    </label>
                    <label className="circle-keyline-toggle">
                      <input type="checkbox" checked={wheelConfig.conj_arcs} onChange={(e) => updateWheelConfig('conj_arcs', e.target.checked)} />
                      <span className="circle-indicator" />
                      <span className="toggle-label">conj arcs</span>
                    </label>
                  </div>
                </div>

                <div className="gen-action split">
                  <button type="button" className="gen-btn secondary" onClick={() => setCurrentStep(1)}>← return to your birth</button>
                  <button type="button" className="gen-btn" onClick={() => setCurrentStep(3)}>continue to your colors →</button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step-panel" data-step="3">
                <div className="knob-group">
                  <span className="t">colors</span>
                  <div className="color-grid">
                    {[
                      ['ink', 'ink'],
                      ['tint_fire', 'fire'],
                      ['tint_earth', 'earth'],
                      ['tint_air', 'air'],
                      ['tint_water', 'water'],
                      ['aspect_soft', 'soft'],
                      ['aspect_hard', 'hard'],
                      ['aspect_conj', 'conj'],
                    ].map(([key, label]) => (
                      <label className="color-label" key={key}>
                        <span>{label}</span>
                        <input type="color" value={wheelConfig[key]} onChange={(e) => updateWheelConfig(key, e.target.value)} />
                      </label>
                    ))}
                  </div>
                </div>

                <details className="knob-fine" open>
                  <summary>fine-tune</summary>
                  <div className="knob-group">
                    <span className="t">layout</span>
                    <div className="grid2">
                      <label>
                        <span>glyph scale</span>
                        <div className="range-control">
                          <input type="range" min="0.6" max="1.6" step="0.05" value={wheelConfig.glyph_scale} onChange={(e) => updateWheelConfig('glyph_scale', Number(e.target.value))} />
                          <output>{wheelConfig.glyph_scale.toFixed(2)}×</output>
                        </div>
                      </label>
                      <label>
                        <span>text scale</span>
                        <div className="range-control">
                          <input type="range" min="0.6" max="1.6" step="0.05" value={wheelConfig.text_scale} onChange={(e) => updateWheelConfig('text_scale', Number(e.target.value))} />
                          <output>{wheelConfig.text_scale.toFixed(2)}×</output>
                        </div>
                      </label>
                      <label>
                        <span>line scale</span>
                        <div className="range-control">
                          <input type="range" min="0.5" max="2.0" step="0.05" value={wheelConfig.line_scale} onChange={(e) => updateWheelConfig('line_scale', Number(e.target.value))} />
                          <output>{wheelConfig.line_scale.toFixed(2)}×</output>
                        </div>
                      </label>
                      <label>
                        <span>band width</span>
                        <div className="range-control">
                          <input type="range" min="0.6" max="1.4" step="0.05" value={wheelConfig.band_width} onChange={(e) => updateWheelConfig('band_width', Number(e.target.value))} />
                          <output>{wheelConfig.band_width.toFixed(2)}×</output>
                        </div>
                      </label>
                      <label>
                        <span>core scale</span>
                        <div className="range-control">
                          <input type="range" min="0.7" max="1.1" step="0.05" value={wheelConfig.core_scale} onChange={(e) => updateWheelConfig('core_scale', Number(e.target.value))} />
                          <output>{wheelConfig.core_scale.toFixed(2)}×</output>
                        </div>
                      </label>
                    </div>
                  </div>
                </details>

                <div className="running-scroll" />

                {chartError && <div className="gen-alert mono">{chartError}</div>}

                <div className="gen-action">
                  <button className="gen-btn primary" type="submit" disabled={chartLoading}>{chartLoading ? 'generating…' : 'generate my chart →'}</button>
                </div>
              </div>
            )}
          </div>
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
          <div className="chart-output">
            {chartContent}
          </div>
          <div className="plabel mono"><span>synastral — natal record</span><span>fig. 01</span></div>
          {chartLoaded && (
            <a className="btn poster-btn" href="/shop">Get this as a print-quality poster →</a>
          )}
        </div>
      </div>
    </section>
  )
}
