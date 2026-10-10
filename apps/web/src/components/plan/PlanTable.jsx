import { MEAL_SLOTS, SLOT_LABELS } from '../../lib/constants'
import { shortDateISO, weekdayISO } from '../../lib/dates'
import { dayIssues, dayNutrition } from '../../lib/planner'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { SlotPicker } from './SlotPicker'

function CheckCell({ date }) {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  const issues = dayIssues(plan, date, preferences)
  const nutrition = dayNutrition(plan, date)

  const calorieGoal = Number(preferences.nutritionGoals?.calories) || 0
  const proteinGoal = Number(preferences.nutritionGoals?.protein) || 0

  // Only judge a day against the goals once all three meals are planned.
  const complete = nutrition.filled === MEAL_SLOTS.length
  const notes = []
  if (complete && calorieGoal) {
    if (nutrition.calories < calorieGoal * 0.8) notes.push('below your calorie goal')
    else if (nutrition.calories > calorieGoal * 1.2) notes.push('above your calorie goal')
  }
  if (complete && proteinGoal && nutrition.protein < proteinGoal * 0.8) {
    notes.push('short on protein')
  }

  return (
    <td className="plan-table__check">
      {issues.length ? (
        <span className="check check--bad">{issues.join('; ')}</span>
      ) : nutrition.filled ? (
        <span className="check check--ok">OK</span>
      ) : (
        <span className="check check--empty">Nothing planned</span>
      )}

      {nutrition.filled ? (
        <span className="check__nutrition">
          ~{nutrition.calories.toLocaleString()} kcal · {nutrition.protein} g
          protein per person
          {notes.length ? ` (${notes.join(', ')})` : ''}
        </span>
      ) : null}
    </td>
  )
}

// Requirement 5.3: one row per day the plan covers, in date order, each labelled
// by its date first and then the day of the week. There is no week to choose
// between any more: the plan is the days the user picked, however many there
// are and however far apart.
export function PlanTable({ onOpenRecipe }) {
  const { plan, dates, highlight, today, clearDay } = useMealPlan()

  return (
    <div className="table-wrap">
      <table className="plan-table">
        <caption className="visually-hidden">
          Meals for each day of your plan, with a status check per day
        </caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {MEAL_SLOTS.map((slot) => (
              <th key={slot} scope="col">
                {SLOT_LABELS[slot]}
              </th>
            ))}
            <th scope="col">Check</th>
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const isNew = highlight.includes(date)
            const isToday = date === today
            const filled = (plan.days?.[date] ?? []).some((slot) => slot.recipe)

            const rowClass = [isNew ? 'is-new' : '', isToday ? 'is-today' : '']
              .filter(Boolean)
              .join(' ')

            return (
              <tr key={date} className={rowClass || undefined}>
                <th scope="row" className="plan-table__day">
                  <span className="plan-table__date">{shortDateISO(date)}</span>
                  <span className="plan-table__weekday">
                    {weekdayISO(date)}
                  </span>
                  {isToday ? (
                    <span className="plan-table__today">Today</span>
                  ) : null}
                  {filled ? (
                    <button
                      type="button"
                      className="link-button plan-table__clear"
                      onClick={() => clearDay(date)}
                    >
                      Clear
                    </button>
                  ) : null}
                </th>
                {MEAL_SLOTS.map((slot, slotIndex) => (
                  <td key={slot}>
                    <SlotPicker
                      date={date}
                      slotIndex={slotIndex}
                      onOpenRecipe={onOpenRecipe}
                    />
                  </td>
                ))}
                <CheckCell date={date} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
