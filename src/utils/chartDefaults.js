export const defaultAspectSettings = {
  maxOrb: 8,
  minFootprint: 1,
}

export const defaultAppearanceSettings = {
  theme: 'INK',
  glyphScale: 1.0,
}

export function buildDefaultWheelConfig() {
  return {
    aspects_shown: 'all',
    max_orb: defaultAspectSettings.maxOrb,
    orb_fade: false,
    aspect_hub: true,
    conj_arcs: false,
    show_halo: false,
    min_footprint: defaultAspectSettings.minFootprint,
    glyph_scale: defaultAppearanceSettings.glyphScale,
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
    theme: defaultAppearanceSettings.theme,
  }
}

export const defaultWheelConfig = buildDefaultWheelConfig()
