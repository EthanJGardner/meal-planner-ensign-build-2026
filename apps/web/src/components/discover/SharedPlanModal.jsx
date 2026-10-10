import { useState } from 'react'
import { SLOT_LABELS, MEAL_SLOTS } from '../../lib/constants'
import {
  longDateISO,
  shiftISO,
  shortDateISO,
  todayISO,
  weekdayISO,
} from '../../lib/dates'
import { findRecipe } from '../../lib/planner'
import { sharedPlanSlots } from '../../lib/sharedPlans'
import { avoidConflictLabels } from '../../lib/avoid'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { Modal } from '../common/Modal'
import { RecipeDetail } from '../plan/RecipeDetail'

// Requirement 5.6: see a browsed plan's recipes before committing to it, then
// land it on real dates. A shared plan is a run of days, so the only thing to
// choose is the date it starts on — days of the week do not mean anything once
// the plan is a set of calendar dates.
export function SharedPlanModal({ shared, score, onClose }) {
  const { preferences } = useHousehold()
  const { plan, copySharedWeek, copySharedDay } = useMealPlan()

  const [viewing, setViewing] = useState(null)
  const [startDate, setStartDate] = useState(
    () => preferences.planDates?.[0] ?? todayISO(),
  )

  const recipe = viewing ? findRecipe(plan, viewing) : null

  if (recipe) {
    return (
      <Modal title={recipe.name} onClose={onClose}>
        <p className="modal__actions">
          <button type="button" className="button" onClick={() => setViewing(null)}>
            Back to the plan
          </button>
        </p>
        <RecipeDetail
          recipe={recipe}
          servings={Math.max(1, Number(preferences.householdSize) || 1)}
          conflicts={avoidConflictLabels(recipe, preferences.avoid ?? [])}
        />
      </Modal>
    )
  }

  const rows = sharedPlanSlots(shared)
  const daily = shared.kind === 'daily'
  const landsOn = rows.map((_, offset) => shiftISO(startDate, offset))

  return (
    <Modal title={shared.title} onClose={onClose}>
      <p className="modal__context">
        {shared.author} · {score}% match · select any meal to read its recipe
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Lands on</th>
              {MEAL_SLOTS.map((slot) => (
                <th key={slot} scope="col">
                  {SLOT_LABELS[slot]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={landsOn[index]}>
                <th scope="row">
                  {shortDateISO(landsOn[index])}
                  <span className="data-table__muted">
                    {' '}
                    {weekdayISO(landsOn[index]).slice(0, 3)}
                  </span>
                </th>
                {row.map((cell, slotIndex) => (
                  <td key={MEAL_SLOTS[slotIndex]}>
                    {cell?.recipe ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setViewing(cell.recipe)}
                      >
                        {cell.leftover ? `Leftovers: ${cell.recipe}` : cell.recipe}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal__actions">
        <label className="inline-field">
          <span>{daily ? 'Add to' : 'Start on'}</span>
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
          onClick={() => {
            if (daily) copySharedDay(shared, startDate)
            else copySharedWeek(shared, startDate)
            onClose()
          }}
        >
          {daily ? 'Add this day to my plan' : 'Add these days to my plan'}
        </button>
      </div>

      <p className="fine-print">
        {daily
          ? `This lands on ${longDateISO(startDate)}.`
          : `This lands on ${longDateISO(landsOn[0])} through ${longDateISO(
              landsOn[landsOn.length - 1],
            )}.`}{' '}
        Those days join the ones you picked. Meals are re-checked against your
        own setup when you add them, and anything that does not fit is swapped
        automatically.
      </p>
    </Modal>
  )
}
