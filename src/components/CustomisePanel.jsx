import { useEffect, useRef, useState } from 'react'

const tabs = [
  { id: 'style', label: 'Style' },
  { id: 'detail', label: 'Detail' },
]

const THEME_OPTIONS = [
  { id: 'ink', label: 'Ink', swatchClass: 'theme-swatch-ink' },
  { id: 'bw', label: 'B&W', swatchClass: 'theme-swatch-bw' },
]

const BACKGROUND_OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'white', label: 'White' },
]

const PALETTE_FIELDS = [
  ['ink', 'Ink'],
  ['tint_fire', 'Fire tint'],
  ['tint_earth', 'Earth tint'],
  ['tint_air', 'Air tint'],
  ['tint_water', 'Water tint'],
  ['aspect_soft', 'Trine / sextile'],
  ['aspect_hard', 'Square / opposition'],
  ['aspect_conj', 'Conjunction'],
]

export default function CustomisePanel({
  settings,
  visualSettings,
  chartOptions,
  hasPendingChanges = false,
  onUpdateSettings,
  onUpdateVisualSettings,
  onUpdateChartOptions,
  onApplyChanges,
  onClose,
  onReturnToInput,
}) {
  const [activeTab, setActiveTab] = useState('style')
  const [isApplying, setIsApplying] = useState(false)
  const applyTimerRef = useRef(null)

  useEffect(() => () => {
    if (applyTimerRef.current) {
      window.clearTimeout(applyTimerRef.current)
      applyTimerRef.current = null
    }
  }, [])

  const updateSetting = (key, value) => {
    onUpdateSettings({ [key]: value })
  }

  const updateVisual = (patch) => {
    onUpdateVisualSettings(patch)
  }

  const handleApplyChanges = async () => {
    if (isApplying) return

    setIsApplying(true)
    await new Promise((resolve) => {
      applyTimerRef.current = window.setTimeout(() => {
        applyTimerRef.current = null
        resolve()
      }, 2000)
    })

    await onApplyChanges?.()
    setIsApplying(false)
  }

  return (
    <div className="customise-panel" id="chart-customise-panel" role="dialog" aria-label="Chart customisation panel" aria-modal="false">
      <div className="customise-panel-head">
        <div className="customise-panel-title">
          <p className="t">customise</p>
          {hasPendingChanges && <span className="customise-pending-dot" aria-label="Unapplied changes" />}
        </div>
        <div className="customise-panel-actions">
          <button type="button" className="customise-secondary" onClick={onReturnToInput}>
            edit birth details
          </button>
          <button type="button" className="customise-close" onClick={onClose} aria-label="back to chart">
            <span aria-hidden="true">&#10005;</span>
            <span>back to chart</span>
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
                      onClick={() => updateVisual({ theme: option.id })}
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
                      onClick={() => updateVisual({ background: option.id })}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="group-label">Palette</span>
              <div className="palette-grid">
                {PALETTE_FIELDS.map(([key, label]) => (
                  <label key={key} className="palette-field">
                    <input
                      type="color"
                      value={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="panel-detail" role="tabpanel" aria-labelledby="tab-detail" className={activeTab === 'detail' ? 'is-active' : ''}>
          <div className="knob-group">
            <span className="t">structure</span>
            <div className="toggle-row">
              <label className="circle-keyline-toggle">
                <input
                  type="checkbox"
                  checked={visualSettings.show_placements}
                  onChange={(e) => updateVisual({ show_placements: e.target.checked })}
                />
                <span className="circle-indicator" />
                <span className="toggle-label">Show planet placements</span>
              </label>
              <label className="circle-keyline-toggle">
                <input
                  type="checkbox"
                  checked={visualSettings.show_aspects}
                  onChange={(e) => updateVisual({ show_aspects: e.target.checked })}
                />
                <span className="circle-indicator" />
                <span className="toggle-label">Show aspect lines</span>
              </label>
              <label className="circle-keyline-toggle">
                <input
                  type="checkbox"
                  checked={chartOptions.include_minor_aspects}
                  onChange={(e) => onUpdateChartOptions({ include_minor_aspects: e.target.checked })}
                />
                <span className="circle-indicator" />
                <span className="toggle-label">Aspects to angles &amp; points</span>
              </label>
              <label className="circle-keyline-toggle">
                <input
                  type="checkbox"
                  checked={settings.show_decans}
                  onChange={(e) => updateSetting('show_decans', e.target.checked)}
                />
                <span className="circle-indicator" />
                <span className="toggle-label">Decan ring</span>
              </label>
            </div>

            <div>
              <span className="group-label">House System</span>
              <div className="radio-pill-group" role="radiogroup" aria-label="House System">
                {[['placidus', 'Placidus'], ['whole_sign', 'Whole Sign']].map(([value, label]) => (
                  <label key={value} className="radio-pill">
                    <input
                      type="radio"
                      name="house-system"
                      checked={chartOptions.house_system === value}
                      onChange={() => onUpdateChartOptions({ house_system: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn-apply"
          type="button"
          onClick={handleApplyChanges}
          disabled={isApplying || !hasPendingChanges}
          aria-busy={isApplying}
        >
          {isApplying ? 'applying…' : 'apply changes'}
        </button>
      </div>
    </div>
  )
}
