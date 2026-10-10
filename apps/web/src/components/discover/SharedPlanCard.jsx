import { useState } from 'react'
import { SLOT_LABELS, MEAL_SLOTS } from '../../lib/constants'
import { shiftISO, shortDateISO, todayISO } from '../../lib/dates'
import {
  describeSharedPlan,
  scoreSharedPlan,
  sharedPlanCost,
} from '../../lib/sharedPlans'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { SharedPlanModal } from './SharedPlanModal'

export function SharedPlanCard({ shared, isClosest }) {
  const { preferences } = useHousehold()
  const { plan, copySharedWeek, copySharedDay } = useMealPlan()

  const [open, setOpen] = useState(false)
  // Requirement 5.6: a shared plan lands on real dates, so the only choice is
  // the date it starts on. It defaults to the first day the user picked.
  const [startDate, setStartDate] = useState(
    () => preferences.planDates?.[0] ?? todayISO(),
  )

  const { score, reasons, avoidUnsafeCount, unsafeCount } = scoreSharedPlan(
    shared,
    plan.recipes,
    preferences,
  )

  const householdSize = Math.max(1, Number(preferences.householdSize) || 1)
  const cost = sharedPlanCost(shared, plan.recipes, householdSize)

  const viewerWeekly =
    Number(preferences.budget) > 0
      ? (Number(preferences.budget) / (Number(preferences.planningPeriod) || 1)) *
        (shared.kind === 'daily' ? 1 : 7)
      : 0

  const costNote = viewerWeekly
    ? cost <= viewerWeekly
      ? ', inside your budget'
      : `, over your budget by $${(cost - viewerWeekly).toFixed(0)}`
    : ''

  return (
    <article className="plan-card">
      <p className="plan-card__match">
        {score}% match{isClosest ? ' · closest to you' : ''}
      </p>
      <h3 className="plan-card__title">{shared.title}</h3>
      <p className="plan-card__by">{describeSharedPlan(shared)}</p>

      <p className="chip-row">
        {shared.tags.map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
        {reasons.map((reason) => (
          <span key={reason} className="chip chip--good">
            {reason}
          </span>
        ))}
        {avoidUnsafeCount ? (
          <span className="chip chip--alert">
            {avoidUnsafeCount} meal{avoidUnsafeCount > 1 ? 's' : ''} contain
            something you cannot have — swapped on add
          </span>
        ) : unsafeCount ? (
          <span className="chip chip--warn">
            {unsafeCount} meal{unsafeCount > 1 ? 's' : ''} do not fit your diet —
            swapped on add
          </span>
        ) : null}
      </p>

      <ul className="plan-card__meals">
        {shared.kind === 'daily'
          ? shared.day.map((cell, index) => (
              <li key={MEAL_SLOTS[index]}>
                {SLOT_LABELS[MEAL_SLOTS[index]]}: {cell.recipe}
              </li>
            ))
          : shared.days.slice(0, 4).map((day, index) => (
              <li key={shiftISO(startDate, index)}>
                {shortDateISO(shiftISO(startDate, index))} dinner:{' '}
                {day[2]?.recipe ?? '—'}
              </li>
            ))}
        {shared.kind === 'weekly' ? <li>and 3 more dinners</li> : null}
      </ul>

      <p className="plan-card__cost">
        About ${cost.toFixed(0)} for your household
        {shared.kind === 'daily' ? ' that day' : ' that week'}
        {costNote} (estimated)
      </p>

      <div className="plan-card__actions">
        <button type="button" className="button" onClick={() => setOpen(true)}>
          View plan and recipes
        </button>
      </div>

      <div className="plan-card__actions">
        <label className="inline-field">
          <span>{shared.kind === 'daily' ? 'Add to' : 'Start on'}</span>
          <input
            type="date"
            className="input input--date"
            min={todayISO()}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value || todayISO())}
          />
        </label>
        <button
          type="button"
          className="button button--accent"
          disabled={!startDate || startDate < todayISO()}
          onClick={() =>
            shared.kind === 'daily'
              ? copySharedDay(shared, startDate)
              : copySharedWeek(shared, startDate)
          }
        >
          Add to my plan
        </button>
      </div>

      {open ? (
        <SharedPlanModal
          shared={shared}
          score={score}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </article>
  )
}
