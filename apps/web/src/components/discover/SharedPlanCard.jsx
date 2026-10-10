import { useState } from 'react'
import { CURRENT_WEEK, SLOT_LABELS, MEAL_SLOTS, WEEK_DAYS, WEEKS_IN_PLAN } from '../../lib/constants'
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
  const [targetWeek, setTargetWeek] = useState(CURRENT_WEEK)
  const [targetDay, setTargetDay] = useState(0)

  const { score, reasons, allergenUnsafeCount, unsafeCount } = scoreSharedPlan(
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
        {allergenUnsafeCount ? (
          <span className="chip chip--alert">
            {allergenUnsafeCount} meal{allergenUnsafeCount > 1 ? 's' : ''} contain
            an allergen you avoid — swapped on add
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
              <li key={WEEK_DAYS[index]}>
                {WEEK_DAYS[index].slice(0, 3)} dinner: {day[2]?.recipe ?? '—'}
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
        {shared.kind === 'daily' ? (
          <>
            <label className="inline-field">
              <span>Add to</span>
              <select
                value={targetDay}
                onChange={(event) => setTargetDay(Number(event.target.value))}
              >
                {WEEK_DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button button--accent"
              onClick={() => copySharedDay(shared, targetDay)}
            >
              Add to my plan
            </button>
          </>
        ) : (
          <>
            <label className="inline-field">
              <span>Add to</span>
              <select
                value={targetWeek}
                onChange={(event) => setTargetWeek(Number(event.target.value))}
              >
                {Array.from({ length: WEEKS_IN_PLAN - CURRENT_WEEK }, (_, offset) => {
                  const week = CURRENT_WEEK + offset
                  return (
                    <option key={week} value={week}>
                      Week {week + 1}
                      {week === CURRENT_WEEK ? ' (this week)' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
            <button
              type="button"
              className="button button--accent"
              onClick={() => copySharedWeek(shared, targetWeek)}
            >
              Add to my plan
            </button>
          </>
        )}
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
