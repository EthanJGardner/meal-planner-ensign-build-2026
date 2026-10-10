import { useState } from 'react'
import { COMMON_ALLERGENS } from '../../lib/constants'
import { useHousehold } from '../../hooks/useHousehold'

export function AllergySelector() {
  const { preferences, toggleAllergy } = useHousehold()
  const [customAllergen, setCustomAllergen] = useState('')

  const customAllergies = preferences.allergies.filter(
    (allergy) => !COMMON_ALLERGENS.includes(allergy),
  )

  const addCustomAllergen = () => {
    const value = customAllergen.trim()
    if (!value || preferences.allergies.includes(value)) {
      setCustomAllergen('')
      return
    }
    toggleAllergy(value)
    setCustomAllergen('')
  }

  return (
    <fieldset className="field-group field-group--allergy">
      <legend className="field-group__legend">
        Allergies
        <span className="field-group__badge">Safety first</span>
      </legend>
      <p className="field-group__hint">
        Allergies apply to everyone in the household. Every meal we plan avoids
        all of them.
      </p>

      <div className="checkbox-grid">
        {COMMON_ALLERGENS.map((allergen) => (
          <label key={allergen} className="checkbox checkbox--allergy">
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
            value={customAllergen}
            onChange={(event) => setCustomAllergen(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomAllergen()
              }
            }}
          />
          <button type="button" className="button" onClick={addCustomAllergen}>
            Add
          </button>
        </div>
      </div>

      {customAllergies.length ? (
        <ul className="chip-list">
          {customAllergies.map((allergy) => (
            <li key={allergy}>
              <button
                type="button"
                className="chip chip--removable"
                onClick={() => toggleAllergy(allergy)}
              >
                {allergy}
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Remove {allergy}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {preferences.allergies.length ? (
        <p className="field-group__note" role="status">
          Avoiding: {preferences.allergies.join(', ')}
        </p>
      ) : (
        <p className="field-group__note">No allergies selected yet.</p>
      )}
    </fieldset>
  )
}
