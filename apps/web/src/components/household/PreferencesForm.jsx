import {
  COOKING_TIME_OPTIONS,
  DIETARY_RESTRICTIONS,
  PLANNING_PERIOD_OPTIONS,
} from '../../lib/constants'
import { useAccountSetup } from '../../hooks/useAccountSetup'
import { useHousehold } from '../../hooks/useHousehold'
import { AccountTastesFields } from '../account/AccountTastesFields'
import { NutritionGoalsFields } from '../account/NutritionGoalsFields'

// `account` swaps in a signed-in user's fields: liked and disliked foods as
// lists, and nutrition goals with carbs and fat. A guest's form is unchanged.
export function PreferencesForm({ account = false }) {
  const { preferences, setPreference, setNutritionGoal, toggleRestriction } =
    useHousehold()
  const sizeProblem = useAccountSetup()?.problems.householdSize

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
            max={account ? 20 : 12}
            value={preferences.householdSize}
            onChange={(event) =>
              setPreference('householdSize', Number(event.target.value))
            }
          />
          <p className="field__hint">
            Every meal is planned for {preferences.householdSize}{' '}
            {preferences.householdSize === 1 ? 'serving' : 'servings'}.
          </p>
          {account && sizeProblem ? (
            <p className="mt-1 text-sm font-semibold text-bad">{sizeProblem}</p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="planning-period">
            Planning period
          </label>
          <select
            id="planning-period"
            className="input"
            value={preferences.planningPeriod}
            onChange={(event) =>
              setPreference('planningPeriod', Number(event.target.value))
            }
          >
            {PLANNING_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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

        {account ? (
          <AccountTastesFields />
        ) : (
          <div className="field">
            <label className="field__label" htmlFor="food-preferences">
              Foods you love or want to avoid
            </label>
            <textarea
              id="food-preferences"
              className="input input--textarea"
              rows="3"
              placeholder="e.g. lots of chicken, no mushrooms, kid-friendly dinners"
              value={preferences.foodPreferences}
              onChange={(event) =>
                setPreference('foodPreferences', event.target.value)
              }
            />
            <p className="field__hint">
              Start a phrase with &ldquo;no&rdquo; or &ldquo;avoid&rdquo; to rule
              something out. Everything else nudges the plan towards it.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Goals and limits</legend>

        {account ? (
          <NutritionGoalsFields />
        ) : (
          <>
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
          </>
        )}

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
            Meals are chosen to stay inside this. We tell you when that is not
            possible.
          </p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="cooking-time">
            Time per meal
          </label>
          <select
            id="cooking-time"
            className="input"
            value={preferences.cookingTime}
            onChange={(event) =>
              setPreference('cookingTime', Number(event.target.value))
            }
          >
            {COOKING_TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
    </div>
  )
}
