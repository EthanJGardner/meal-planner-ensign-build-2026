import { useState } from 'react'
import { COMMON_ALLERGENS } from '../../lib/constants'
import { useHousehold } from '../../hooks/useHousehold'

// Requirement 4.1: allergies come first because they are the highest-priority
// safety input, and they apply to the whole household.
export function AllergySelector() {
  const { preferences, toggleAllergy } = useHousehold()
  const [custom, setCustom] = useState('')

  const customAllergies = preferences.allergies.filter(
    (allergy) => !COMMON_ALLERGENS.includes(allergy),
  )

  const addCustom = () => {
    const value = custom.trim()
    if (value && !preferences.allergies.includes(value)) toggleAllergy(value)
    setCustom('')
  }

  return (
    <fieldset className="fieldset fieldset--allergy">
      <legend className="fieldset__legend">
        Allergies
        <span className="pill">Safety first</span>
      </legend>

      <p className="fieldset__lede">
        Allergies apply to everyone in the household. Every meal we plan avoids
        all of them.
      </p>

      <div className="checkbox-grid">
        {COMMON_ALLERGENS.map((allergen) => (
          <label key={allergen} className="checkbox">
            <input
              type="checkbox"
              checked={preferences.allergies.includes(allergen)}
              onChange={() => toggleAllergy(allergen)}
            />
            <span>{allergen}</span>
          </label>
        ))}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="custom-allergen">
          Another allergen
        </label>
        <div className="field__row">
          <input
            id="custom-allergen"
            type="text"
            className="input"
            placeholder="e.g. Mustard"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustom()
              }
            }}
          />
          <button type="button" className="button" onClick={addCustom}>
            Add
          </button>
        </div>
      </div>

      {customAllergies.length ? (
        <p className="chip-row">
          {customAllergies.map((allergy) => (
            <button
              key={allergy}
              type="button"
              className="chip chip--removable"
              onClick={() => toggleAllergy(allergy)}
            >
              {allergy}
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Remove {allergy}</span>
            </button>
          ))}
        </p>
      ) : null}

      <p className="fieldset__summary" role="status">
        {preferences.allergies.length
          ? `Every meal avoids: ${preferences.allergies.join(', ')}.`
          : 'No allergies selected yet.'}
      </p>
    </fieldset>
  )
}
