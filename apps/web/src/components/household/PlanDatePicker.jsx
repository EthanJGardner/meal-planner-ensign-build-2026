import { useState } from 'react'
import { WEEK_DAYS } from '../../lib/constants'
import {
  addDays,
  addMonths,
  isPast,
  isPlannableISO,
  isToday,
  longDate,
  monthGrid,
  monthLabel,
  planRangeLabel,
  sameMonth,
  startOfMonth,
  toISO,
  today,
} from '../../lib/dates'
import { useHousehold } from '../../hooks/useHousehold'

const SHORT_DAYS = WEEK_DAYS.map((day) => day.slice(0, 3))

// Requirement 5.1: the days to plan for are picked on a calendar rather than
// chosen from preset lengths, so a user can plan Monday, Thursday and the
// weekend without planning the days in between. Today is highlighted, anything
// before it is out of reach, and the month arrows go as far ahead as the user
// wants to plan.
export function PlanDatePicker() {
  const { preferences, togglePlanDate, setPlanDates } = useHousehold()
  const [month, setMonth] = useState(() => startOfMonth(today()))

  const selected = preferences.planDates ?? []
  const atFirstMonth = sameMonth(month, today())

  const pickRun = (count) =>
    setPlanDates(
      Array.from({ length: count }, (_, offset) =>
        toISO(addDays(today(), offset)),
      ),
    )

  // How many days are picked in the month on screen, so paging ahead still
  // shows the user where they are.
  const inThisMonth = selected.filter((iso) =>
    iso.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`),
  ).length

  return (
    <div className="field">
      <p className="field__label" id="plan-days-label">
        Days to plan for
      </p>

      <div className="calendar" role="group" aria-labelledby="plan-days-label">
        <div className="calendar__head">
          <button
            type="button"
            className="calendar__nav"
            onClick={() => setMonth(addMonths(month, -1))}
            disabled={atFirstMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="calendar__month" aria-live="polite">
            {monthLabel(month)}
            {inThisMonth ? (
              <span className="calendar__month-count">
                {inThisMonth} picked
              </span>
            ) : null}
          </p>
          <button
            type="button"
            className="calendar__nav"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="calendar__grid">
          {SHORT_DAYS.map((day, index) => (
            <span
              key={day}
              className="calendar__weekday"
              aria-hidden="true"
              title={WEEK_DAYS[index]}
            >
              {day}
            </span>
          ))}

          {monthGrid(month).flat().map((date) => {
            const iso = toISO(date)
            const outside = !sameMonth(date, month)
            const unavailable = isPast(date) || !isPlannableISO(iso)
            const current = isToday(date)
            const picked = selected.includes(iso)

            const classes = ['calendar__day']
            if (picked) classes.push('is-picked')
            if (current) classes.push('is-today')
            if (unavailable) classes.push('is-past')
            if (outside) classes.push('is-outside')

            return (
              <button
                key={iso}
                type="button"
                className={classes.join(' ')}
                disabled={unavailable}
                aria-pressed={picked}
                aria-current={current ? 'date' : undefined}
                aria-label={`${longDate(date)}${current ? ' (today)' : ''}`}
                onClick={() => togglePlanDate(iso)}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        <div className="calendar__actions">
          <button
            type="button"
            className="button button--small"
            onClick={() => pickRun(7)}
          >
            Next 7 days
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => pickRun(14)}
          >
            Next 14 days
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => setPlanDates([])}
          >
            Clear
          </button>
        </div>
      </div>

      <p
        className={
          selected.length ? 'fieldset__summary' : 'fieldset__summary is-warning'
        }
        role="status"
      >
        {selected.length
          ? `${selected.length} ${
              selected.length === 1 ? 'day' : 'days'
            } picked · ${planRangeLabel(selected)}. Your budget is split across ${
              selected.length === 1 ? 'that day' : 'those days'
            }.`
          : 'No days picked yet. Choose at least one before you build a plan.'}
      </p>
    </div>
  )
}
