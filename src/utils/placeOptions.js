function readNumber(values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return ''
}

export function normalizePlaceOption(option = {}) {
  if (!option || typeof option !== 'object') {
    return { label: '', lat: '', lon: '' }
  }

  const label = [
    option.label,
    option.name,
    option.city,
    option.display_name,
    option.place_name,
    option.value,
    option.text,
  ].find((value) => typeof value === 'string' && value.trim())

  const lat = readNumber([
    option.lat,
    option.latitude,
    option.location?.lat,
    option.coordinates?.lat,
    option.geometry?.location?.lat,
    option.position?.lat,
  ])

  const lon = readNumber([
    option.lon,
    option.lng,
    option.longitude,
    option.location?.lon,
    option.location?.lng,
    option.coordinates?.lon,
    option.coordinates?.lng,
    option.geometry?.location?.lng,
    option.position?.lon,
  ])

  return {
    label: label?.trim() || '',
    lat,
    lon,
  }
}

export function resolvePlaceSelection(value, options = []) {
  const normalizedValue = String(value ?? '').trim().toLowerCase()
  if (!normalizedValue) return { lat: '', lon: '' }

  const match = options
    .map(normalizePlaceOption)
    .find((option) => {
      const label = option.label.trim().toLowerCase()
      return label && (label === normalizedValue || label.startsWith(normalizedValue) || normalizedValue.startsWith(label))
    })

  if (!match) return { lat: '', lon: '' }

  return { lat: String(match.lat), lon: String(match.lon) }
}
