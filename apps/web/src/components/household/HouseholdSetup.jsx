import { useState } from 'react'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { AllergySelector } from './AllergySelector'
import { PreferencesForm } from './PreferencesForm'

export function HouseholdSetup() {
  const { preferences, resetPreferences } = useHousehold()
  const { plan, status, generatePlan } = useMealPlan()
  const [open, setOpen] = useState(true)

  const isLoading = status === 'loading'
  const collapsible = Boolean(plan)
  const expanded = !collapsible || open

  const handleSubmit = (event) => {
    event.preventDefault()
    generatePlan()
    if (collapsible) setOpen(false)
  }

  return (
    <section className="panel" id="household" aria-labelledby="household-title">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="household-title">
            Your household
          </h2>
          <p className="panel__subtitle">
            Allergies first, then everything else we need to build the plan.
          </p>
        </div>
        {collapsible ? (
          <button
            type="button"
            className="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={expanded}
            aria-controls="household-form"
          >
            {expanded ? 'Hide' : 'Edit preferences'}
          </button>
        ) : null}
      </header>

      {expanded ? (
        <form id="household-form" onSubmit={handleSubmit}>
          <AllergySelector />
          <PreferencesForm />

          <div className="panel__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={isLoading}
            >
              {isLoading
                ? 'Building your plan…'
                : plan
                  ? 'Regenerate whole plan'
                  : 'Generate meal plan'}
            </button>
            <button type="button" className="button" onClick={resetPreferences}>
              Reset to defaults
            </button>
          </div>
        </form>
      ) : (
        <dl className="summary-strip">
          <div>
            <dt>Household</dt>
            <dd>{preferences.householdSize} people</dd>
          </div>
          <div>
            <dt>Allergies</dt>
            <dd>
              {preferences.allergies.length
                ? preferences.allergies.join(', ')
                : 'None'}
            </dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>${preferences.budget}</dd>
          </div>
          <div>
            <dt>Period</dt>
            <dd>{preferences.planningPeriod} days</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
