import { describe, expect, it } from 'vitest'
import { formatBirthTime } from './birthTime.js'

describe('formatBirthTime', () => {
  it('converts 12-hour time to 24-hour time', () => {
    expect(formatBirthTime({ hour: '1', minute: '05', meridiem: 'AM' })).toBe('01:05')
    expect(formatBirthTime({ hour: '11', minute: '59', meridiem: 'PM' })).toBe('23:59')
  })

  it('handles 12 AM and 12 PM correctly', () => {
    expect(formatBirthTime({ hour: '12', minute: '00', meridiem: 'AM' })).toBe('00:00')
    expect(formatBirthTime({ hour: '12', minute: '00', meridiem: 'PM' })).toBe('12:00')
  })

  it('rejects empty values', () => {
    expect(formatBirthTime({ hour: '', minute: '00', meridiem: 'AM' })).toBe('')
    expect(formatBirthTime({ hour: '1', minute: '', meridiem: 'AM' })).toBe('')
    expect(formatBirthTime({ hour: '1', minute: '00', meridiem: '' })).toBe('')
  })

  it('rejects out-of-range hour values', () => {
    expect(formatBirthTime({ hour: '0', minute: '00', meridiem: 'AM' })).toBe('')
    expect(formatBirthTime({ hour: '13', minute: '00', meridiem: 'PM' })).toBe('')
  })

  it('rejects out-of-range minute values', () => {
    expect(formatBirthTime({ hour: '1', minute: '-1', meridiem: 'AM' })).toBe('')
    expect(formatBirthTime({ hour: '1', minute: '60', meridiem: 'AM' })).toBe('')
  })
})
