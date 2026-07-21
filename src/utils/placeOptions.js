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

function normalizeQuery(query) {
  if (typeof query !== 'string') return ''
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.split(',')[0].trim()
}

function cityFromLabel(label) {
  if (typeof label !== 'string') return ''
  return label.split(',')[0].trim().toLowerCase()
}

function scoreOption(option, normalizedQuery) {
  if (!normalizedQuery || normalizedQuery.length < 4) return 0
  const label = typeof option?.label === 'string' ? option.label.trim().toLowerCase() : ''
  if (!label) return 0

  const isPrefixMatch = label.startsWith(normalizedQuery)
  const isExactCityMatch = cityFromLabel(label) === normalizedQuery

  if (isPrefixMatch && isExactCityMatch) return 3
  if (isPrefixMatch) return 2
  if (isExactCityMatch) return 1
  return 0
}

export function prioritisePlaceOptions(options, query) {
  const source = Array.isArray(options) ? options : []
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery || normalizedQuery.length < 4) {
    return [...source]
  }

  return source
    .map((option, index) => ({ option, index, score: scoreOption(option, normalizedQuery) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .map(({ option }) => option)
}

// Selection state for the accessible places combobox (WP-3.2). The selected
// option object (or null) is the single source of truth for "is a place
// chosen" — no more string-matching the input value against option labels.
export const INITIAL_PLACE_SELECTION_STATE = { place: '', selectedPlace: null }

export function placeSelectionReducer(state, action) {
  switch (action.type) {
    // Typing always clears any prior selection — the previously selected
    // option no longer necessarily corresponds to what's in the input.
    case 'CHANGE_TEXT':
      return { place: action.text, selectedPlace: null }
    case 'SELECT':
      return { place: action.option.label, selectedPlace: action.option }
    case 'RESET':
      return { ...INITIAL_PLACE_SELECTION_STATE }
    default:
      return state
  }
}

// Pure helper for Up/Down keyboard navigation through the listbox: wraps
// around at either end, and lands on the first/last item when nothing is
// highlighted yet (current === -1).
export function nextComboboxIndex(current, length, direction) {
  if (!length) return -1
  if (current < 0) return direction > 0 ? 0 : length - 1
  return (current + direction + length) % length
}
