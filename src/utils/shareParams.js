// WP-3.3 — share-link codec.
//
// Encodes the current birth-chart inputs into a shareable URL's query
// string, and decodes+validates that query string back into a shape the
// Hero form can prefill from. Decoding is intentionally all-or-nothing: any
// missing or invalid field yields `null` so a partial or tampered URL never
// partially clobbers the form (COMMON CONTEXT rule 9 — the on-load
// auto-generate this feeds is a single call, so a bad decode should just
// silently fall back to the normal empty input stage, not half-fill it).
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{2}):(\d{2})$/

function isValidCalendarDate(dateStr) {
  const match = DATE_RE.exec(dateStr)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  // Catches "junk" calendar dates (Feb 30, day 00, month 13, etc.) by
  // round-tripping through Date and checking nothing got normalized away.
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValid24HourTime(timeStr) {
  const match = TIME_RE.exec(timeStr)
  if (!match) return false
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function parseCoord(value, min, max) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < min || num > max) return null
  return num
}

/**
 * Splits a validated 24-hour "HH:MM" string (the same shape
 * `formatBirthTime` returns) into the 12-hour hour/minute/meridiem shape
 * the birth-time form fields use. Only call this on a string that has
 * already passed `parseShareParams` — it assumes a valid "HH:MM" input.
 */
export function splitTime24(time) {
  const match = TIME_RE.exec(time)
  if (!match) return null
  const hour24 = Number(match[1])
  const minute = match[2]
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour: String(hour12), minute, meridiem }
}

/**
 * Builds the shareable chart URL from the current form inputs.
 * `date` is "YYYY-MM-DD", `time` is 24-hour "HH:MM", `lat`/`lon` are
 * numbers, `place` is the selected place's display label.
 */
export function buildShareUrl({ date, time, lat, lon, place }, siteUrl) {
  const base = String(siteUrl || '').replace(/\/+$/, '') + '/'
  const params = [
    `d=${encodeURIComponent(date)}`,
    `t=${encodeURIComponent(time)}`,
    `lat=${encodeURIComponent(lat)}`,
    `lon=${encodeURIComponent(lon)}`,
    `place=${encodeURIComponent(place)}`,
  ].join('&')
  return `${base}?${params}`
}

/**
 * Parses and validates a share link's query params. Accepts anything
 * `URLSearchParams` can consume directly (a `URLSearchParams` instance, a
 * query string with or without a leading "?", or `location.search`).
 *
 * All-or-nothing: returns `null` unless every field is present AND valid,
 * otherwise returns `{ date, time, lat, lon, place }` — `date`/`time` are
 * already in the form-native "YYYY-MM-DD"/"HH:MM" shapes (split `time`
 * further with `splitTime24` to get the 12-hour form fields), `lat`/`lon`
 * are numbers, `place` is the trimmed display label.
 */
export function parseShareParams(input) {
  let search
  try {
    search = input instanceof URLSearchParams ? input : new URLSearchParams(String(input ?? ''))
  } catch {
    return null
  }

  const date = search.get('d')
  const time = search.get('t')
  const latRaw = search.get('lat')
  const lonRaw = search.get('lon')
  const place = search.get('place')

  if (!date || !time || !latRaw || !lonRaw || !place) return null
  if (!isValidCalendarDate(date)) return null
  if (!isValid24HourTime(time)) return null

  const lat = parseCoord(latRaw, -90, 90)
  const lon = parseCoord(lonRaw, -180, 180)
  if (lat === null || lon === null) return null

  const trimmedPlace = place.trim()
  if (!trimmedPlace) return null

  return { date, time, lat, lon, place: trimmedPlace }
}
