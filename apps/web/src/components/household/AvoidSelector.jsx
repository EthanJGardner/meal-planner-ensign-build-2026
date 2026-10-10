import { useState } from 'react'
import {
  COMMON_ALLERGENS,
  OTHER_AVOIDED_INGREDIENTS,
} from '../../lib/constants'
import { useHousehold } from '../../hooks/useHousehold'

// Requirement 4.1/5.1: one section for everything that must never appear in a
// meal, allergen or not, because the user thinks of it as one question: what
// can't we eat? Every entry is followed strictly.
//
// The standard allergens are still grouped and labelled on their own inside the
// section (requirement 7.3): they are the entries where being wrong is a safety
// problem rather than a bad dinner, and they are matched more aggressively —
// ticking Milk also rules out cheese, butter and yogurt.
export function AvoidSelector() {
  const { preferences, toggleAvoided } = useHousehold()
  const [custom, setCustom] = useState('')

  const avoid = preferences.avoid ?? []
  const known = [...COMMON_ALLERGENS, ...OTHER_AVOIDED_INGREDIENTS]
  const customEntries = avoid.filter((entry) => !known.includes(entry))

  const addCustom = () => {
    const value = custom.trim()
    if (value && !avoid.includes(value)) toggleAvoided(value)
    setCustom('')
  }

  const checkboxes = (items) => (
    <div className="checkbox-grid">
      {items.map((item) => (
        <label key={item} className="checkbox">
          <input
            type="checkbox"
            checked={avoid.includes(item)}
            onChange={() => toggleAvoided(item)}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  )

  return (
    <fieldset className="fieldset fieldset--allergy">
      <legend className="fieldset__legend">
        What you can&rsquo;t have
        <span className="pill">Followed strictly</span>
      </legend>

      <p className="fieldset__lede">
        Anything you tick here is kept out of every meal we plan, for everyone in
        the household. Allergies and plain dislikes both belong here.
      </p>

      <h3 className="fieldset__group">
        Allergens
        <span className="fieldset__group-note">
          Each of these also rules out the ingredients it hides in
        </span>
      </h3>
      {checkboxes(COMMON_ALLERGENS)}

      <h3 className="fieldset__group">
        Other ingredients
        <span className="fieldset__group-note">
          Things you would rather not eat
        </span>
      </h3>
      {checkboxes(OTHER_AVOIDED_INGREDIENTS)}

      <div className="field">
        <label className="field__label" htmlFor="custom-avoided">
          Anything else
        </label>
        <div className="field__row">
          <input
            id="custom-avoided"
            type="text"
            className="input"
            placeholder="e.g. Mustard, beetroot"
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

      {customEntries.length ? (
        <p className="chip-row">
          {customEntries.map((entry) => (
            <button
              key={entry}
              type="button"
              className="chip chip--removable"
              onClick={() => toggleAvoided(entry)}
            >
              {entry}
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Remove {entry}</span>
            </button>
          ))}
        </p>
      ) : null}

      <p className="fieldset__summary" role="status">
        {avoid.length
          ? `Every meal avoids: ${avoid.join(', ')}.`
          : 'Nothing ruled out yet.'}
      </p>
    </fieldset>
  )
}
