import { SLOT_LABELS, MEAL_SLOTS } from '../../lib/constants'
import { longDateISO } from '../../lib/dates'
import {
  decodeSlotValue,
  encodeSlotValue,
  emptySlot,
  slotOptions,
} from '../../lib/planner'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'

export function SlotPicker({ date, slotIndex, onOpenRecipe }) {
  const { plan, setSlot, setSlotServings } = useMealPlan()
  const { preferences } = useHousehold()

  // A day the user has just picked has no slots in the plan yet, so it renders
  // as an empty row the dropdowns can fill.
  const slot = plan.days?.[date]?.[slotIndex] ?? emptySlot()
  const { options, leftovers } = slotOptions(plan, date, slotIndex, preferences)
  const value = encodeSlotValue(slot.recipe, slot.leftover)

  // A slot can hold a meal the dropdown no longer offers, such as leftovers
  // whose source meal was removed. Keep it listed so the value is never lost.
  const known = [...options, ...leftovers].some((option) => option.value === value)
  const orphan =
    slot.recipe && !known
      ? {
          value,
          label: slot.leftover ? `Leftovers: ${slot.recipe}` : slot.recipe,
        }
      : null

  const label = `${SLOT_LABELS[MEAL_SLOTS[slotIndex]]} on ${longDateISO(date)}`

  return (
    <div className="slot">
      <select
        className={`slot__select${slot.recipe ? '' : ' is-empty'}`}
        aria-label={label}
        value={value}
        onChange={(event) =>
          setSlot(date, slotIndex, decodeSlotValue(event.target.value))
        }
      >
        <option value="">Choose a meal</option>
        {orphan ? <option value={orphan.value}>{orphan.label}</option> : null}
        <optgroup label="Recipes">
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
        {leftovers.length ? (
          <optgroup label="Leftovers">
            {leftovers.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>

      <input
        className="slot__servings"
        type="number"
        min="1"
        inputMode="numeric"
        placeholder={preferences.householdSize}
        title="People for this meal. Leave blank to use your household size."
        aria-label={`People for ${label}`}
        value={slot.servings ?? ''}
        onChange={(event) =>
          setSlotServings(date, slotIndex, event.target.value)
        }
      />

      {slot.recipe ? (
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onOpenRecipe({ date, slotIndex })}
        >
          Recipe
        </button>
      ) : null}
    </div>
  )
}
