import { useState } from 'react'
import { CURRENT_WEEK, SLOT_LABELS, MEAL_SLOTS, WEEK_DAYS, WEEKS_IN_PLAN } from '../../lib/constants'
import { findRecipe } from '../../lib/planner'
import { sharedPlanSlots } from '../../lib/sharedPlans'
import { allergenConflicts } from '../../lib/allergySafety'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { Modal } from '../common/Modal'
import { RecipeDetail } from '../plan/RecipeDetail'

// Requirement 5.6: see a browsed plan's recipes before committing to it.
export function SharedPlanModal({ shared, score, onClose }) {
  const { preferences } = useHousehold()
  const { plan, copySharedWeek, copySharedDay } = useMealPlan()

  const [viewing, setViewing] = useState(null)
  const [targetWeek, setTargetWeek] = useState(CURRENT_WEEK)
  const [targetDay, setTargetDay] = useState(0)

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
          conflicts={allergenConflicts(recipe, preferences.allergies ?? [])}
        />
      </Modal>
    )
  }

  const rows = sharedPlanSlots(shared)

  return (
    <Modal title={shared.title} onClose={onClose}>
      <p className="modal__context">
        {shared.author} · {score}% match · select any meal to read its recipe
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              {MEAL_SLOTS.map((slot) => (
                <th key={slot} scope="col">
                  {SLOT_LABELS[slot]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={WEEK_DAYS[index]}>
                <th scope="row">
                  {shared.kind === 'daily' ? 'Today' : WEEK_DAYS[index].slice(0, 3)}
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
              onClick={() => {
                copySharedDay(shared, targetDay)
                onClose()
              }}
            >
              Add this day to my plan
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
              onClick={() => {
                copySharedWeek(shared, targetWeek)
                onClose()
              }}
            >
              Add this week to my plan
            </button>
          </>
        )}
      </div>

      <p className="fine-print">
        Meals are re-checked against your own allergies and diet when you add
        them, and anything that does not fit is swapped automatically.
      </p>
    </Modal>
  )
}
