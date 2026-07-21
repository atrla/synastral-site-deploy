import { describe, expect, it } from 'vitest'
import {
  INITIAL_PLACE_SELECTION_STATE,
  nextComboboxIndex,
  normalizePlaceOption,
  placeSelectionReducer,
  prioritisePlaceOptions,
} from './placeOptions.js'

describe('normalizePlaceOption', () => {
  it('uses the expected label fallback chain', () => {
    expect(normalizePlaceOption({ label: 'Label', name: 'Name' }).label).toBe('Label')
    expect(normalizePlaceOption({ name: 'Name' }).label).toBe('Name')
    expect(normalizePlaceOption({ city: 'City' }).label).toBe('City')
    expect(normalizePlaceOption({ display_name: 'Display Name' }).label).toBe('Display Name')
    expect(normalizePlaceOption({ place_name: 'Place Name' }).label).toBe('Place Name')
    expect(normalizePlaceOption({ value: 'Value' }).label).toBe('Value')
    expect(normalizePlaceOption({ text: 'Text' }).label).toBe('Text')
  })

  it('extracts lat/lon from supported shapes', () => {
    expect(normalizePlaceOption({ lat: '1.2', lon: '-3.4' })).toEqual({ label: '', lat: 1.2, lon: -3.4 })
    expect(normalizePlaceOption({ latitude: 10, longitude: 20 })).toEqual({ label: '', lat: 10, lon: 20 })
    expect(normalizePlaceOption({ location: { lat: '30', lng: '40' } })).toEqual({ label: '', lat: 30, lon: 40 })
    expect(normalizePlaceOption({ coordinates: { lat: 50, lng: 60 } })).toEqual({ label: '', lat: 50, lon: 60 })
    expect(normalizePlaceOption({ geometry: { location: { lat: 70, lng: 80 } } })).toEqual({ label: '', lat: 70, lon: 80 })
    expect(normalizePlaceOption({ position: { lat: 90, lon: 100 } })).toEqual({ label: '', lat: 90, lon: 100 })
  })

  it('returns empty strings for junk input', () => {
    expect(normalizePlaceOption(null)).toEqual({ label: '', lat: '', lon: '' })
    expect(normalizePlaceOption('bad')).toEqual({ label: '', lat: '', lon: '' })
    expect(normalizePlaceOption({})).toEqual({ label: '', lat: '', lon: '' })
  })
})

describe('placeSelectionReducer', () => {
  const berlin = { label: 'Berlin, Germany', lat: 52.52, lon: 13.405 }

  it('starts with no place and no selection', () => {
    expect(INITIAL_PLACE_SELECTION_STATE).toEqual({ place: '', selectedPlace: null })
  })

  it('stores the selected option object with numeric lat/lon on SELECT', () => {
    const next = placeSelectionReducer(INITIAL_PLACE_SELECTION_STATE, { type: 'SELECT', option: berlin })
    expect(next.place).toBe('Berlin, Germany')
    expect(next.selectedPlace).toEqual(berlin)
    expect(typeof next.selectedPlace.lat).toBe('number')
    expect(typeof next.selectedPlace.lon).toBe('number')
  })

  it('clears the selection when the user types after selecting', () => {
    const selected = placeSelectionReducer(INITIAL_PLACE_SELECTION_STATE, { type: 'SELECT', option: berlin })
    const typed = placeSelectionReducer(selected, { type: 'CHANGE_TEXT', text: 'Berlin, Germ' })
    expect(typed.place).toBe('Berlin, Germ')
    expect(typed.selectedPlace).toBeNull()
  })

  it('resets to the initial state', () => {
    const selected = placeSelectionReducer(INITIAL_PLACE_SELECTION_STATE, { type: 'SELECT', option: berlin })
    expect(placeSelectionReducer(selected, { type: 'RESET' })).toEqual(INITIAL_PLACE_SELECTION_STATE)
  })

  it('ignores unknown actions', () => {
    const selected = placeSelectionReducer(INITIAL_PLACE_SELECTION_STATE, { type: 'SELECT', option: berlin })
    expect(placeSelectionReducer(selected, { type: 'NOOP' })).toBe(selected)
  })
})

describe('nextComboboxIndex', () => {
  it('returns -1 when there are no options', () => {
    expect(nextComboboxIndex(-1, 0, 1)).toBe(-1)
  })

  it('lands on the first item moving down from nothing highlighted', () => {
    expect(nextComboboxIndex(-1, 3, 1)).toBe(0)
  })

  it('lands on the last item moving up from nothing highlighted', () => {
    expect(nextComboboxIndex(-1, 3, -1)).toBe(2)
  })

  it('wraps from the last item to the first moving down', () => {
    expect(nextComboboxIndex(2, 3, 1)).toBe(0)
  })

  it('wraps from the first item to the last moving up', () => {
    expect(nextComboboxIndex(0, 3, -1)).toBe(2)
  })

  it('steps forward and backward within bounds', () => {
    expect(nextComboboxIndex(0, 3, 1)).toBe(1)
    expect(nextComboboxIndex(1, 3, -1)).toBe(0)
  })
})

describe('prioritisePlaceOptions', () => {
  const londonSet = [
    { label: 'London, England, GB', lat: 51.5072, lon: -0.1276 },
    { label: 'London, Ontario, CA', lat: 42.9849, lon: -81.2453 },
    { label: 'Londonderry, Northern Ireland, GB', lat: 54.997, lon: -7.309 },
    { label: 'East London, South Africa, ZA', lat: -33.0153, lon: 27.9116 },
  ]

  it('prioritises London city matches before other prefix matches', () => {
    const sorted = prioritisePlaceOptions(londonSet, 'London')
    expect(sorted.map((option) => option.label)).toEqual([
      'London, England, GB',
      'London, Ontario, CA',
      'Londonderry, Northern Ireland, GB',
      'East London, South Africa, ZA',
    ])
  })

  it('uses the city part of a comma-delimited query', () => {
    const sorted = prioritisePlaceOptions(londonSet, 'London, UK')
    expect(sorted[0].label).toBe('London, England, GB')
  })

  it('does not reorder short 3-character queries', () => {
    const sorted = prioritisePlaceOptions(londonSet, 'Par')
    expect(sorted).toEqual(londonSet)
  })

  it('does not reorder empty queries', () => {
    const sorted = prioritisePlaceOptions(londonSet, '   ')
    expect(sorted).toEqual(londonSet)
  })

  it('prioritises a full city query over other partial matches', () => {
    const sorted = prioritisePlaceOptions(londonSet, 'Londonderry')
    expect(sorted[0].label).toBe('Londonderry, Northern Ireland, GB')
  })
})
