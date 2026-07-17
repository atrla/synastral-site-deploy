export function formatBirthTime({ hour, minute, meridiem }) {
  const hourValue = Number(hour)
  const minuteValue = Number(minute)

  if (!hour || !minute || !meridiem) return ''
  if (!Number.isInteger(hourValue) || hourValue < 1 || hourValue > 12) return ''
  if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) return ''

  const hour24 = meridiem === 'PM'
    ? (hourValue % 12) + 12
    : hourValue % 12

  return `${String(hour24).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`
}
