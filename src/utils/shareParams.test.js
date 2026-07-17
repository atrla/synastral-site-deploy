import { describe, expect, it } from 'vitest'
import { buildShareUrl, parseShareParams, splitTime24 } from './shareParams.js'

const VALID = { d: '2026-07-17', t: '14:05', lat: '52.52', lon: '13.405', place: 'Berlin, Germany' }

function toSearch(overrides = {}, omit = []) {
  const params = new URLSearchParams({ ...VALID, ...overrides })
  omit.forEach((key) => params.delete(key))
  return params.toString()
}

describe('buildShareUrl', () => {
  it('builds the expected query string shape from form-native inputs', () => {
    const url = buildShareUrl({ date: '2026-07-17', time: '14:05', lat: 52.52, lon: 13.405, place: 'Berlin, Germany' }, 'https://synastral.com/')
    expect(url).toBe('https://synastral.com/?d=2026-07-17&t=14%3A05&lat=52.52&lon=13.405&place=Berlin%2C%20Germany')
  })

  it('normalizes a site URL with no trailing slash', () => {
    const url = buildShareUrl({ date: '2026-07-17', time: '14:05', lat: 1, lon: 2, place: 'x' }, 'https://synastral.com')
    expect(url.startsWith('https://synastral.com/?')).toBe(true)
  })
})

describe('parseShareParams — happy path', () => {
  it('parses a complete, valid query string', () => {
    expect(parseShareParams(toSearch())).toEqual({
      date: '2026-07-17',
      time: '14:05',
      lat: 52.52,
      lon: 13.405,
      place: 'Berlin, Germany',
    })
  })

  it('accepts a URLSearchParams instance directly', () => {
    const params = new URLSearchParams(toSearch())
    expect(parseShareParams(params)).not.toBeNull()
  })

  it('accepts a leading "?" (location.search shape)', () => {
    expect(parseShareParams(`?${toSearch()}`)).not.toBeNull()
  })

  it('trims whitespace in the place label', () => {
    expect(parseShareParams(toSearch({ place: '  Berlin, Germany  ' }))?.place).toBe('Berlin, Germany')
  })

  it('round-trips through buildShareUrl', () => {
    const url = buildShareUrl({ date: '2026-07-17', time: '14:05', lat: 52.52, lon: 13.405, place: 'Berlin, Germany' }, 'https://synastral.com/')
    const search = new URL(url).search
    expect(parseShareParams(search)).toEqual({
      date: '2026-07-17',
      time: '14:05',
      lat: 52.52,
      lon: 13.405,
      place: 'Berlin, Germany',
    })
  })
})

describe('parseShareParams — missing keys', () => {
  it.each(['d', 't', 'lat', 'lon', 'place'])('returns null when "%s" is missing', (key) => {
    expect(parseShareParams(toSearch({}, [key]))).toBeNull()
  })

  it('returns null for an empty query string', () => {
    expect(parseShareParams('')).toBeNull()
  })

  it('returns null when place is only whitespace', () => {
    expect(parseShareParams(toSearch({ place: '   ' }))).toBeNull()
  })
})

describe('parseShareParams — junk dates', () => {
  it.each([
    'not-a-date',
    '2024/01/01',
    '2024-13-01', // month 13
    '2024-02-30', // Feb 30 doesn't exist
    '2024-00-10', // month 0
    '2024-01-00', // day 0
    '2024-01-32', // day 32
    '',
    '2024-1-1', // not zero-padded
  ])('rejects %s', (badDate) => {
    expect(parseShareParams(toSearch({ d: badDate }))).toBeNull()
  })

  it('accepts a leap-day date', () => {
    expect(parseShareParams(toSearch({ d: '2024-02-29' }))).not.toBeNull()
  })

  it('rejects a leap day in a non-leap year', () => {
    expect(parseShareParams(toSearch({ d: '2023-02-29' }))).toBeNull()
  })
})

describe('parseShareParams — junk times', () => {
  it.each([
    'not-a-time',
    '25:00', // hour out of range
    '10:60', // minute out of range
    '1:05', // not zero-padded
    '10:5',
    '',
  ])('rejects %s', (badTime) => {
    expect(parseShareParams(toSearch({ t: badTime }))).toBeNull()
  })
})

describe('parseShareParams — out-of-range / junk coords', () => {
  it.each(['91', '-91', '1000', 'abc', '', 'NaN'])('rejects lat=%s', (badLat) => {
    expect(parseShareParams(toSearch({ lat: badLat }))).toBeNull()
  })

  it.each(['181', '-181', '1000', 'abc', '', 'NaN'])('rejects lon=%s', (badLon) => {
    expect(parseShareParams(toSearch({ lon: badLon }))).toBeNull()
  })

  it('accepts boundary coordinates', () => {
    expect(parseShareParams(toSearch({ lat: '90', lon: '180' }))).not.toBeNull()
    expect(parseShareParams(toSearch({ lat: '-90', lon: '-180' }))).not.toBeNull()
  })
})

describe('parseShareParams — never throws on garbage input', () => {
  const garbage = [
    null,
    undefined,
    '???',
    '&&&&',
    '%zz',
    'd=&t=&lat=&lon=&place=',
    'd=2026-07-17&t=14:05&lat=52.52&lon=13.405', // missing place entirely
    Array(2000).fill('d=x').join('&'), // pathological length
  ]

  it.each(garbage)('input %#: no throw, and null unless fully valid', (input) => {
    expect(() => parseShareParams(input)).not.toThrow()
    expect(parseShareParams(input)).toBeNull()
  })
})

describe('splitTime24', () => {
  it('splits midnight to 12 AM', () => {
    expect(splitTime24('00:00')).toEqual({ hour: '12', minute: '00', meridiem: 'AM' })
  })

  it('splits noon to 12 PM', () => {
    expect(splitTime24('12:00')).toEqual({ hour: '12', minute: '00', meridiem: 'PM' })
  })

  it('splits a morning time', () => {
    expect(splitTime24('01:05')).toEqual({ hour: '1', minute: '05', meridiem: 'AM' })
  })

  it('splits an evening time', () => {
    expect(splitTime24('23:59')).toEqual({ hour: '11', minute: '59', meridiem: 'PM' })
  })

  it('returns null for an invalid shape', () => {
    expect(splitTime24('not-a-time')).toBeNull()
  })
})
