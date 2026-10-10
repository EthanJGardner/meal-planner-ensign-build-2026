// Calendar dates for the plan.
//
// A plan is keyed by date ('YYYY-MM-DD'), not by a position in a fixed grid, so
// the user can plan any set of days as far ahead as they like. Dates are held
// as local-time ISO day strings because that is what a user means by "Tuesday
// the 14th", and because they sort chronologically as plain strings.

export const DAYS_IN_WEEK = 7

// A bound on how far ahead a day can be picked. Not a product limit so much as
// a guard on what a stored preference is allowed to contain.
export const MAX_DAYS_AHEAD = 730

const MS_PER_DAY = 86_400_000

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const today = () => startOfDay(new Date())

// Counted in whole calendar days rather than milliseconds, so a
// daylight-saving change cannot shift a date by one.
const dayNumber = (date) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  )

export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from)

export function addDays(date, count) {
  const next = startOfDay(date)
  next.setDate(next.getDate() + count)
  return next
}

export const toISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

export function fromISO(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export const todayISO = () => toISO(today())

export const isToday = (date) => daysBetween(today(), date) === 0
export const isPast = (date) => daysBetween(today(), date) < 0

export const isPastISO = (iso) => {
  const date = fromISO(iso)
  return !date || isPast(date)
}

// Day arithmetic straight on ISO strings, which is how the plan holds them.
export const shiftISO = (iso, count) => {
  const date = fromISO(iso)
  return date ? toISO(addDays(date, count)) : iso
}

export const daysBetweenISO = (from, to) => {
  const a = fromISO(from)
  const b = fromISO(to)
  return a && b ? daysBetween(a, b) : Number.POSITIVE_INFINITY
}

// --- month grids -------------------------------------------------------------

export const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1)

export function addMonths(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth() + count, 1)
  return next
}

// Monday of the week containing `date`. getDay() is Sunday-first, so shift it.
export const mondayOf = (date) => addDays(date, -((date.getDay() + 6) % 7))

export const sameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

// Six Monday-first weeks covering the month `date` falls in, padded with the
// days either side so every month renders at the same height. A calendar that
// changes shape as you page through it is a calendar that looks broken.
export function monthGrid(date) {
  const first = startOfMonth(date)
  const start = mondayOf(first)

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, day) =>
      addDays(start, week * DAYS_IN_WEEK + day),
    ),
  )
}

// --- picked days -------------------------------------------------------------

// A day can be planned from today up to MAX_DAYS_AHEAD. Yesterday is not
// something anyone can shop for.
export function isPlannableISO(iso) {
  const date = fromISO(iso)
  if (!date) return false
  const offset = daysBetween(today(), date)
  return offset >= 0 && offset <= MAX_DAYS_AHEAD
}

// Drops anything out of range or already past, de-duplicates, and sorts. Stored
// preferences outlive the day they were picked on, so this runs on the way out
// of storage as well as on the way in.
export function sanitizePlanDates(dates = []) {
  const kept = new Set()

  for (const iso of dates) {
    if (typeof iso === 'string' && isPlannableISO(iso)) kept.add(iso)
  }

  return [...kept].sort()
}

// The default selection: today plus the next few days.
export const defaultPlanDates = (count = 5) =>
  Array.from({ length: count }, (_, offset) => toISO(addDays(today(), offset)))

// --- labels ------------------------------------------------------------------

export const shortDate = (date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const longDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

export const weekdayName = (date) =>
  date.toLocaleDateString(undefined, { weekday: 'long' })

export const monthLabel = (date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export const shortDateISO = (iso) => {
  const date = fromISO(iso)
  return date ? shortDate(date) : iso
}

export const longDateISO = (iso) => {
  const date = fromISO(iso)
  return date ? longDate(date) : iso
}

export const weekdayISO = (iso) => {
  const date = fromISO(iso)
  return date ? weekdayName(date) : ''
}

export function planRangeLabel(dates = []) {
  const sorted = [...dates].sort()
  if (!sorted.length) return 'no days picked'
  if (sorted.length === 1) return shortDateISO(sorted[0])
  return `${shortDateISO(sorted[0])} – ${shortDateISO(sorted[sorted.length - 1])}`
}
