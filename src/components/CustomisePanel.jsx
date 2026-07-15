import { useEffect, useState } from 'react'

function SliderField({ label, min, max, step, value, unit = '', onChange, onRelease }) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100
  const displayValue = Number.isInteger(step) ? Number(value).toString() : Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')

  return (
    <div className="ruled-slider">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{displayValue}{unit}</span>
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
        onMouseUp={() => onRelease?.(value)}
        onTouchEnd={() => onRelease?.(value)}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onRelease?.(value)
        }}
        className="range-input"
      />
      <div className="rule-labels">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

const tabs = [
  { id: 'style', label: 'Style' },
  { id: 'chart', label: 'Chart' },
  { id: 'detail', label: 'Detail' },
]

const THEME_OPTIONS = [
  { id: 'ink', label: 'Ink', swatchClass: 'theme-swatch-ink' },
  { id: 'midnight', label: 'Midnight', swatchClass: 'theme-swatch-midnight' },
  { id: 'bw', label: 'B&W', swatchClass: 'theme-swatch-bw' },
]

const BACKGROUND_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'transparent', label: 'Transparent' },
]

const EXPORT_FORMATS = ['png', 'svg']
const EXPORT_RESOLUTIONS = ['1x', '2x', '3x']

export default function CustomisePanel({ settings, visualSettings, onUpdateSettings, onUpdateVisualSettings, onClose, onReturnToInput }) {
  const [activeTab, setActiveTab] = useState('style')
  const [maxOrbDraft, setMaxOrbDraft] = useState(settings.max_orb)
  const [minFootprintDraft, setMinFootprintDraft] = useState(settings.min_footprint)

  useEffect(() => {
    setMaxOrbDraft(settings.max_orb)
  }, [settings.max_orb])

  useEffect(() => {
    setMinFootprintDraft(settings.min_footprint)
  }, [settings.min_footprint])

  const updateSetting = (key, value, options = {}) => {
    onUpdateSettings({ [key]: value }, options)
  }

  const updateVisual = (patch, options = {}) => {
    onUpdateVisualSettings(patch, options)
  }

  const aspectStyle = (() => {
    if (!settings.aspect_hub) return 'lines'
    if (settings.conj_arcs) return 'both'
    return 'hub'
  })()

  const applyAspectStyle = (value) => {
    const next = { orb_fade: false, aspect_hub: true, conj_arcs: false }
    if (value === 'lines') next.aspect_hub = false
    if (value === 'both') next.conj_arcs = true
    onUpdateSettings(next, { shouldGenerate: true, pulseGroup: 'aspects' })
  }

  return (
    <div className="customise-panel" id="chart-customise-panel" role="dialog" aria-label="Chart customisation panel" aria-modal="false">
      <div className="customise-panel-head">
        <p className="t">customise</p>
        <div className="customise-panel-actions">
          <button type="button" className="customise-secondary" onClick={onReturnToInput}>
            Edit Birth Details
          </button>
          <button type="button" className="customise-close" onClick={onClose} aria-label="Back to chart">
            <span aria-hidden="true">&#10005;</span>
            <span>Back to Chart</span>
          </button>
        </div>
      </div>
      <button type="button" className="sheet-handle" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="customise-scroll">
        <div className="customise-tabs" role="tablist" aria-label="Customisation sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className="tab-btn"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div id="panel-style" role="tabpanel" aria-labelledby="tab-style" className={activeTab === 'style' ? 'is-active' : ''}>
        <div className="knob-group">
          <span className="t">local customisation</span>

          <div>
            <span className="group-label">Theme</span>
            <div className="theme-card-grid" role="radiogroup" aria-label="Theme">
              {THEME_OPTIONS.map((option) => {
                const selected = visualSettings.theme === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`theme-card${selected ? ' is-selected' : ''}`}
                    onClick={() => updateVisual({ theme: option.id }, { pulseGroup: 'surface' })}
                  >
                    <span className={`theme-swatch ${option.swatchClass}`} aria-hidden="true" />
                    <span className="theme-card-label">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="group-label">Background</span>
            <div className="segment-control" role="radiogroup" aria-label="Background">
              {BACKGROUND_OPTIONS.map((option) => {
                const selected = visualSettings.background === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`segment-btn${selected ? ' is-selected' : ''}`}
                    onClick={() => updateVisual({ background: option.id }, { pulseGroup: 'surface' })}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="panel-chart" role="tabpanel" aria-labelledby="tab-chart" className={activeTab === 'chart' ? 'is-active' : ''}>
        <div className="knob-group">
          <span className="t">structure</span>
          <div className="toggle-row">
            <label className="circle-keyline-toggle">
              <input
                type="checkbox"
                checked={visualSettings.show_placements}
                onChange={(e) => updateVisual({ show_placements: e.target.checked }, { pulseGroup: 'placements' })}
              />
              <span className="circle-indicator" />
              <span className="toggle-label">Show planet placements</span>
            </label>
            <label className="circle-keyline-toggle">
              <input
                type="checkbox"
                checked={visualSettings.show_aspects}
                onChange={(e) => updateVisual({ show_aspects: e.target.checked }, { pulseGroup: 'aspects' })}
              />
              <span className="circle-indicator" />
              <span className="toggle-label">Show aspect lines</span>
            </label>
          </div>
          <SliderField
            label="Max Orb"
            min={0}
            max={12}
            step={0.5}
            value={maxOrbDraft}
            onChange={(value) => {
              setMaxOrbDraft(value)
              updateSetting('max_orb', value, { shouldGenerate: true, pulseGroup: 'aspects' })
            }}
            onRelease={(value) => updateSetting('max_orb', value, { shouldGenerate: true, pulseGroup: 'aspects' })}
          />
          <SliderField
            label="Min Footprint"
            min={0}
            max={5}
            step={0.5}
            value={minFootprintDraft}
            onChange={(value) => {
              setMinFootprintDraft(value)
              updateSetting('min_footprint', value, { shouldGenerate: true, pulseGroup: 'aspects' })
            }}
            onRelease={(value) => updateSetting('min_footprint', value, { shouldGenerate: true, pulseGroup: 'aspects' })}
          />

          <div>
            <span className="group-label">Aspect Style</span>
            <div className="radio-pill-group" role="radiogroup" aria-label="Aspect Style">
              {['lines', 'hub', 'both'].map((value) => (
                <label key={value} className="radio-pill">
                  <input
                    type="radio"
                    name="aspect-style"
                    checked={aspectStyle === value}
                    onChange={() => applyAspectStyle(value)}
                  />
                  <span>{value[0].toUpperCase() + value.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="panel-detail" role="tabpanel" aria-labelledby="tab-detail" className={activeTab === 'detail' ? 'is-active' : ''}>
        <div className="knob-group">
          <span className="t">detail</span>
          <SliderField
            label="Line Width"
            min={0.5}
            max={3}
            step={0.25}
            value={visualSettings.line_width}
            onChange={(value) => updateVisual({ line_width: value }, { pulseGroup: 'lines' })}
          />
          <SliderField
            label="Glyph Size"
            min={8}
            max={24}
            step={1}
            value={visualSettings.glyph_size}
            onChange={(value) => updateVisual({ glyph_size: value }, { pulseGroup: 'glyphs' })}
          />
          <SliderField
            label="Font Size"
            min={8}
            max={16}
            step={1}
            value={visualSettings.font_size}
            onChange={(value) => updateVisual({ font_size: value }, { pulseGroup: 'text' })}
          />

          <div>
            <span className="group-label">Export Settings</span>
            <div className="export-row">
              <div>
                <span className="group-label small">Format</span>
                <div className="radio-pill-group" role="radiogroup" aria-label="Export Format">
                  {EXPORT_FORMATS.map((format) => (
                    <label key={format} className="radio-pill">
                      <input
                        type="radio"
                        name="export-format"
                        checked={visualSettings.export_format === format}
                        onChange={() => updateVisual({ export_format: format }, { pulseGroup: 'frame' })}
                      />
                      <span>{format.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="group-label small">Resolution</span>
                <div className="radio-pill-group" role="radiogroup" aria-label="Export Resolution">
                  {EXPORT_RESOLUTIONS.map((resolution) => (
                    <label key={resolution} className="radio-pill">
                      <input
                        type="radio"
                        name="export-resolution"
                        checked={visualSettings.export_resolution === resolution}
                        onChange={() => updateVisual({ export_resolution: resolution }, { pulseGroup: 'frame' })}
                      />
                      <span>{resolution}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
