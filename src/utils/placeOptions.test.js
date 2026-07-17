import { describe, expect, it } from 'vitest'
import { normalizePlaceOption, resolvePlaceSelection } from './placeOptions.js'

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

describe('resolvePlaceSelection', () => {
  const options = [
    { label: 'Berlin, Germany', lat: 52.52, lon: 13.405 },
    { label: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  ]

  it('resolves exact label matches', () => {
    expect(resolvePlaceSelection('Berlin, Germany', options)).toEqual({ lat: '52.52', lon: '13.405' })
  })

  it('resolves prefix matches', () => {
    expect(resolvePlaceSelection('Ber', options)).toEqual({ lat: '52.52', lon: '13.405' })
  })

  it('returns empty strings when no match is found', () => {
    expect(resolvePlaceSelection('Tokyo', options)).toEqual({ lat: '', lon: '' })
  })
})
