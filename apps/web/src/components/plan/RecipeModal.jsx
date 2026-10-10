import { MEAL_SLOTS, MEAL_STATUS, SLOT_LABELS } from '../../lib/constants'
import { avoidConflictLabels } from '../../lib/avoid'
import { longDateISO } from '../../lib/dates'
import { isCustomRecipe } from '../../lib/customRecipes'
import { alternativesFor, findRecipe, slotServings } from '../../lib/planner'
import { recipeProblems } from '../../lib/mealFilters'
import { describeSwaps, hasSwaps } from '../../lib/substitutions'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { Modal } from '../common/Modal'
import { RecipeDetail } from './RecipeDetail'

export function RecipeModal({ date, slotIndex, onClose, onEditRecipe }) {
  const { preferences } = useHousehold()
  const {
    plan,
    setSlot,
    acceptSlot,
    rejectSlot,
    toggleSavedSlot,
    requestAlternative,
    busySlot,
  } = useMealPlan()

  const slot = plan.days?.[date]?.[slotIndex]
  const recipe = slot ? findRecipe(plan, slot.recipe) : null

  if (!recipe) return null

  const slotName = MEAL_SLOTS[slotIndex]
  const conflicts = avoidConflictLabels(recipe, preferences.avoid ?? [])
  const problems = recipeProblems(recipe, preferences)
  const alternatives = alternativesFor(plan, recipe.name, slotIndex, preferences)
  const servings = slotServings(slot, preferences)
  const isBusy = busySlot === `${date}-${slotIndex}`

  const title = slot.leftover ? `Leftovers: ${recipe.name}` : recipe.name

  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal__context">
        {SLOT_LABELS[slotName]} · {longDateISO(date)} · {servings}{' '}
        {servings === 1 ? 'serving' : 'servings'}
        {slot.leftover ? ' · reheated from the day before' : ''}
      </p>

      {hasSwaps(recipe) ? (
        <p className="alert alert--soft">
          {describeSwaps(recipe)} Everything else in the recipe is unchanged.
        </p>
      ) : null}

      {problems.length ? (
        <p className="alert" role="alert">
          <strong>Do not cook this as planned.</strong>{' '}
          {problems.map((problem) => problem.message).join('. ')}. Swap it for
          one of the alternatives below.
        </p>
      ) : null}

      <div className="modal__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => acceptSlot(date, slotIndex)}
          disabled={slot.status === MEAL_STATUS.ACCEPTED}
        >
          {slot.status === MEAL_STATUS.ACCEPTED ? 'Accepted' : 'Accept this meal'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => rejectSlot(date, slotIndex)}
          disabled={slot.status === MEAL_STATUS.REJECTED}
        >
          {slot.status === MEAL_STATUS.REJECTED ? 'Rejected' : 'Reject'}
        </button>
        <button
          type="button"
          className={`button${slot.saved ? ' is-active' : ''}`}
          aria-pressed={slot.saved}
          onClick={() => toggleSavedSlot(date, slotIndex)}
        >
          {slot.saved ? 'Saved' : 'Save this recipe'}
        </button>
        <button
          type="button"
          className="button"
          disabled={isBusy}
          onClick={() => requestAlternative(date, slotIndex)}
        >
          {isBusy ? 'Finding another…' : 'Suggest another'}
        </button>
        {isCustomRecipe(recipe) ? (
          <button
            type="button"
            className="button"
            onClick={() => onEditRecipe?.(recipe)}
          >
            Edit this recipe
          </button>
        ) : null}
      </div>

      {alternatives.length ? (
        <section className="modal__section">
          <h3 className="recipe__heading">Alternatives that fit your setup</h3>
          <ul className="alternatives">
            {alternatives.map((option) => (
              <li key={option.name} className="alternatives__item">
                <div>
                  <p className="alternatives__name">{option.name}</p>
                  <p className="alternatives__meta">
                    {option.cookTimeMinutes} min prep ·{' '}
                    {option.nutritionPerServing.calories} kcal ·{' '}
                    {option.nutritionPerServing.protein} g protein per serving
                    {hasSwaps(option) ? ` · ${describeSwaps(option)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setSlot(date, slotIndex, {
                      recipe: option.name,
                      leftover: false,
                    })
                    onClose()
                  }}
                >
                  Use this
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="fine-print">
          No other {slotName} option fits your setup. Take something off the
          list of things you cannot have to see more.
        </p>
      )}

      <RecipeDetail recipe={recipe} servings={servings} conflicts={conflicts} />
    </Modal>
  )
}
