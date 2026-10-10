import { useState } from 'react'
import { MEAL_STATUS } from '../../lib/constants'
import { findIngredientConflicts } from '../../lib/allergySafety'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { MealAlternatives } from './MealAlternatives'
import { RecipeDetail } from './RecipeDetail'

const STATUS_LABELS = {
  [MEAL_STATUS.PENDING]: 'Best fit',
  [MEAL_STATUS.ACCEPTED]: 'In your plan',
  [MEAL_STATUS.REJECTED]: 'Rejected',
}

export function MealCard({ meal }) {
  const { preferences } = useHousehold()
  const {
    acceptMeal,
    rejectMeal,
    toggleSaved,
    replaceMeal,
    requestAlternative,
    busyMealId,
  } = useMealPlan()

  const [showRecipe, setShowRecipe] = useState(false)
  const [alternativesOverride, setAlternativesOverride] = useState(null)

  const isRejected = meal.status === MEAL_STATUS.REJECTED
  const isBusy = busyMealId === meal.id

  // Rejecting a meal opens its replacements, unless the user closed them.
  const showAlternatives = alternativesOverride ?? isRejected

  const conflicts = findIngredientConflicts(meal, preferences.allergies)

  return (
    <article className={`meal-card meal-card--${meal.status}`}>
      <header className="meal-card__header">
        <div>
          <p className="meal-card__type">{meal.mealType}</p>
          <h3 className="meal-card__name">{meal.name}</h3>
        </div>
        <span className={`status-pill status-pill--${meal.status}`}>
          {STATUS_LABELS[meal.status]}
        </span>
      </header>

      <ul className="meal-card__meta">
        <li>{meal.cookTimeMinutes} min</li>
        <li>
          {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}
        </li>
        <li>${Number(meal.estimatedCost).toFixed(2)}</li>
        {meal.nutritionPerServing ? (
          <li>{meal.nutritionPerServing.calories} cal/serving</li>
        ) : null}
      </ul>

      {conflicts.length ? (
        <p className="allergy-warning" role="alert">
          <strong>Check before cooking.</strong> This meal lists{' '}
          {conflicts
            .map(
              (conflict) =>
                `${conflict.ingredients.join(', ')} (${conflict.allergy})`,
            )
            .join('; ')}
          , which may conflict with your allergies. Swap it or verify the
          product labels yourself.
        </p>
      ) : null}

      <div className="meal-card__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => acceptMeal(meal.id)}
          disabled={meal.status === MEAL_STATUS.ACCEPTED}
        >
          {meal.status === MEAL_STATUS.ACCEPTED ? 'Accepted' : 'Accept'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => rejectMeal(meal.id)}
          disabled={isRejected}
        >
          Reject
        </button>
        <button
          type="button"
          className={`button button--icon ${meal.saved ? 'is-active' : ''}`}
          onClick={() => toggleSaved(meal.id)}
          aria-pressed={meal.saved}
        >
          {meal.saved ? '♥ Saved' : '♡ Save'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => requestAlternative(meal.id)}
          disabled={isBusy}
        >
          {isBusy ? 'Swapping…' : 'Swap this meal'}
        </button>
      </div>

      <div className="meal-card__toggles">
        <button
          type="button"
          className="link-button"
          onClick={() => setShowRecipe((current) => !current)}
          aria-expanded={showRecipe}
        >
          {showRecipe ? 'Hide recipe' : 'View recipe & ingredients'}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => setAlternativesOverride(!showAlternatives)}
          aria-expanded={showAlternatives}
        >
          {showAlternatives
            ? 'Hide alternatives'
            : `Alternatives (${meal.alternatives?.length ?? 0})`}
        </button>
      </div>

      {showRecipe ? <RecipeDetail meal={meal} /> : null}

      {showAlternatives ? (
        <MealAlternatives
          alternatives={meal.alternatives ?? []}
          onChoose={(alternative) => {
            replaceMeal(meal.id, alternative)
            setAlternativesOverride(false)
          }}
        />
      ) : null}
    </article>
  )
}
