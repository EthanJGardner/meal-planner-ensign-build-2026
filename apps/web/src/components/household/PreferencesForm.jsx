import { DIETARY_RESTRICTIONS, PREP_TIME_OPTIONS } from '../../lib/constants'
import { useHousehold } from '../../hooks/useHousehold'
import { PlanDatePicker } from './PlanDatePicker'

export function PreferencesForm() {
  const { preferences, setPreference, setNutritionGoal, toggleRestriction } =
    useHousehold()

  return (
    <div className="fieldset-grid">
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Household</legend>

        <div className="field">
          <label className="field__label" htmlFor="household-size">
            People eating
          </label>
          <input
            id="household-size"
            type="number"
            className="input"
            min="1"
            max="12"
            value={preferences.householdSize}
            onChange={(event) =>
              setPreference('householdSize', Number(event.target.value))
            }
          />
          <p className="field__hint">
            Every meal is planned for {preferences.householdSize}{' '}
            {preferences.householdSize === 1 ? 'serving' : 'servings'}.
          </p>
        </div>

        <PlanDatePicker />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Diet and tastes</legend>

        <div className="checkbox-grid checkbox-grid--single">
          {DIETARY_RESTRICTIONS.map((restriction) => (
            <label key={restriction} className="checkbox">
              <input
                type="checkbox"
                checked={preferences.dietaryRestrictions.includes(restriction)}
                onChange={() => toggleRestriction(restriction)}
              />
              <span>{restriction}</span>
            </label>
          ))}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="food-preferences">
            Foods you love
          </label>
          <textarea
            id="food-preferences"
            className="input input--textarea"
            rows="3"
            placeholder="e.g. lots of chicken, kid-friendly dinners"
            value={preferences.foodPreferences}
            onChange={(event) =>
              setPreference('foodPreferences', event.target.value)
            }
          />
          <p className="field__hint">
            Everything here nudges the plan towards it. Anything you want kept
            out belongs in the list above, where we match it exactly.
          </p>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Goals and limits</legend>

        <div className="field">
          <label className="field__label" htmlFor="calorie-goal">
            Daily calories per person
          </label>
          <input
            id="calorie-goal"
            type="number"
            className="input"
            min="800"
            max="5000"
            step="50"
            value={preferences.nutritionGoals.calories}
            onChange={(event) =>
              setNutritionGoal('calories', Number(event.target.value))
            }
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="protein-goal">
            Daily protein per person (g)
          </label>
          <input
            id="protein-goal"
            type="number"
            className="input"
            min="10"
            max="300"
            step="5"
            value={preferences.nutritionGoals.protein}
            onChange={(event) =>
              setNutritionGoal('protein', Number(event.target.value))
            }
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="budget">
            Grocery budget for the plan ($)
          </label>
          <input
            id="budget"
            type="number"
            className="input"
            min="0"
            step="5"
            value={preferences.budget}
            onChange={(event) =>
              setPreference('budget', Number(event.target.value))
            }
          />
          <p className="field__hint">
            Meals are chosen to stay inside this, split across the days you
            picked. We tell you when that is not possible.
          </p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="prep-time">
            Prep time
          </label>
          <select
            id="prep-time"
            className="input"
            value={preferences.cookingTime}
            onChange={(event) =>
              setPreference('cookingTime', Number(event.target.value))
            }
          >
            {PREP_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="field__hint">
            How long you want to spend making any one meal.
          </p>
        </div>
      </fieldset>
    </div>
  )
}
