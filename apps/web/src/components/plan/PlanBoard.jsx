import { MEAL_STATUS, MEAL_TYPES } from '../../lib/constants'
import { useMealPlan } from '../../hooks/useMealPlan'
import { MealCard } from './MealCard'

const byMealType = (a, b) =>
  MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType)

export function PlanBoard() {
  const { plan, acceptMeal } = useMealPlan()

  const days = [...new Set(plan.meals.map((meal) => meal.day))].sort(
    (a, b) => a - b,
  )
  const pending = plan.meals.filter(
    (meal) => meal.status === MEAL_STATUS.PENDING,
  )

  return (
    <section className="panel" id="menu" aria-labelledby="menu-title">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="menu-title">
            Your menu
          </h2>
          <p className="panel__subtitle">
            Accept the meals you want. Rejecting one brings up alternatives, and
            swapping replaces just that meal.
          </p>
        </div>
        {pending.length ? (
          <button
            type="button"
            className="button"
            onClick={() => pending.forEach((meal) => acceptMeal(meal.id))}
          >
            Accept all {pending.length} suggestions
          </button>
        ) : null}
      </header>

      {days.map((day) => (
        <div key={day} className="day-group">
          <h3 className="day-group__title">Day {day}</h3>
          <div className="meal-grid">
            {plan.meals
              .filter((meal) => meal.day === day)
              .sort(byMealType)
              .map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
