import { describe, expect, it } from 'vitest'
import { sanitizeFileStem } from './files.js'

describe('sanitizeFileStem', () => {
  it('replaces symbols with dashes', () => {
    expect(sanitizeFileStem('  Hello, World! 2026  ')).toBe('hello-world-2026')
  })

  it('falls back when result is empty', () => {
    expect(sanitizeFileStem('   ')).toBe('synastral-chart')
    expect(sanitizeFileStem('***')).toBe('synastral-chart')
  })
})
