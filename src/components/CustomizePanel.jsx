function SliderField({ label, min, max, step, value, unit = '', onChange }) {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100

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

export default function CustomizePanel({ settings, onUpdateSettings, onBack }) {
  const updateSetting = (key, value) => {
    onUpdateSettings({ [key]: value })
  }

  return (
    <div className="customize-panel">
      <div className="customize-actions">
        <button type="button" className="gen-btn secondary" onClick={onBack}>← back to chart</button>
      </div>

      <div className="knob-group">
        <span className="t">aspects</span>
        <SliderField
          label="max orb"
          min={1}
          max={12}
          step={0.5}
          value={settings.max_orb}
          unit="°"
          onChange={(value) => updateSetting('max_orb', value)}
        />
        <SliderField
          label="min footprint"
          min={0}
          max={20}
          step={0.5}
          value={settings.min_footprint}
          onChange={(value) => updateSetting('min_footprint', value)}
        />
        <div className="toggle-row">
          <label className="circle-keyline-toggle">
            <input type="checkbox" checked={settings.orb_fade} onChange={(e) => updateSetting('orb_fade', e.target.checked)} />
            <span className="circle-indicator" />
            <span className="toggle-label">orb fade</span>
          </label>
          <label className="circle-keyline-toggle">
            <input type="checkbox" checked={settings.aspect_hub} onChange={(e) => updateSetting('aspect_hub', e.target.checked)} />
            <span className="circle-indicator" />
            <span className="toggle-label">aspect hub</span>
          </label>
          <label className="circle-keyline-toggle">
            <input type="checkbox" checked={settings.conj_arcs} onChange={(e) => updateSetting('conj_arcs', e.target.checked)} />
            <span className="circle-indicator" />
            <span className="toggle-label">conj arcs</span>
          </label>
        </div>
      </div>

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
              <input type="color" value={settings[key]} onChange={(e) => updateSetting(key, e.target.value)} />
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
              <span>theme</span>
              <select value={settings.theme || 'INK'} onChange={(e) => updateSetting('theme', e.target.value)}>
                <option value="INK">Ink</option>
                <option value="MOSS">Moss</option>
                <option value="COBALT">Cobalt</option>
                <option value="RUST">Rust</option>
              </select>
            </label>
            <label>
              <span>glyph scale</span>
              <div className="range-control">
                <input type="range" min="0.6" max="1.6" step="0.05" value={settings.glyph_scale} onChange={(e) => updateSetting('glyph_scale', Number(e.target.value))} />
                <output>{settings.glyph_scale.toFixed(2)}×</output>
              </div>
            </label>
            <label>
              <span>text scale</span>
              <div className="range-control">
                <input type="range" min="0.6" max="1.6" step="0.05" value={settings.text_scale} onChange={(e) => updateSetting('text_scale', Number(e.target.value))} />
                <output>{settings.text_scale.toFixed(2)}×</output>
              </div>
            </label>
            <label>
              <span>line scale</span>
              <div className="range-control">
                <input type="range" min="0.5" max="2.0" step="0.05" value={settings.line_scale} onChange={(e) => updateSetting('line_scale', Number(e.target.value))} />
                <output>{settings.line_scale.toFixed(2)}×</output>
              </div>
            </label>
            <label>
              <span>band width</span>
              <div className="range-control">
                <input type="range" min="0.6" max="1.4" step="0.05" value={settings.band_width} onChange={(e) => updateSetting('band_width', Number(e.target.value))} />
                <output>{settings.band_width.toFixed(2)}×</output>
              </div>
            </label>
            <label>
              <span>core scale</span>
              <div className="range-control">
                <input type="range" min="0.7" max="1.1" step="0.05" value={settings.core_scale} onChange={(e) => updateSetting('core_scale', Number(e.target.value))} />
                <output>{settings.core_scale.toFixed(2)}×</output>
              </div>
            </label>
          </div>
        </div>
      </details>
    </div>
  )
}
