import logo from '../../assets/pic-logo.png'
import { CURRENT_WEEK } from '../../lib/constants'
import { isWeekEmpty } from '../../lib/planner'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { AllergySelector } from '../household/AllergySelector'
import { PreferencesForm } from '../household/PreferencesForm'
import { Banner } from '../common/Banner'
import { LoadingState } from '../common/LoadingState'
import { SafetyDisclaimer } from '../common/SafetyDisclaimer'
import { DiscoverSection } from '../discover/DiscoverSection'
import { MyRecipesSection } from '../recipes/MyRecipesSection'

export function SetupView({ onSeePlan }) {
  const { preferences, resetPreferences } = useHousehold()
  const { plan, status, error, notice, note, generatePlan, dismissError } =
    useMealPlan()

  const loading = status === 'loading'
  const hasPlan = Boolean(plan) && !isWeekEmpty(plan, CURRENT_WEEK)

  return (
    <>
      <section className="hero">
        <img
          className="hero__logo"
          src={logo}
          alt="FeedMe"
          width="879"
          height="742"
        />
        <h1 className="hero__title">Weekly meals your whole table can eat</h1>
        <p className="hero__lede">
          Tell us the allergies, the budget, and how long you have to cook. We
          plan breakfast, lunch and dinner for everyone, then turn it into a
          grocery list.
        </p>
      </section>

      <section className="panel" aria-labelledby="household-title">
        <h2 className="panel__title" id="household-title">
          Your household
        </h2>
        <p className="panel__lede">
          Allergies first, then everything else we need to build the plan.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            generatePlan()
          }}
        >
          <AllergySelector />
          <PreferencesForm />

          <div className="panel__actions">
            <button
              type="submit"
              className="button button--primary button--large"
              disabled={loading}
            >
              {loading
                ? 'Building your plan…'
                : hasPlan
                  ? 'Rebuild my plan'
                  : 'Generate meal plan'}
            </button>
            <button type="button" className="button button--large" onClick={resetPreferences}>
              Reset to defaults
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <Banner variant="error" title="We could not build that plan" onDismiss={dismissError}>
          {error}
        </Banner>
      ) : null}

      {notice ? (
        <Banner variant="notice" title="Sample data">
          {notice}
        </Banner>
      ) : null}

      {loading ? (
        <LoadingState label="Building a plan around your allergies and budget…" />
      ) : null}

      <section className="panel panel--next">
        {hasPlan ? (
          <>
            <h2 className="panel__title">Your plan is ready</h2>
            <p className="panel__lede">
              {note ||
                `Built for ${preferences.householdSize} ${
                  preferences.householdSize === 1 ? 'person' : 'people'
                } over ${preferences.planningPeriod} days.`}
            </p>
            <button
              type="button"
              className="button button--primary button--large"
              onClick={onSeePlan}
            >
              See your plan
            </button>
          </>
        ) : (
          <>
            <h2 className="panel__title">No plan yet</h2>
            <p className="panel__lede">
              Fill in your household above and generate a plan. Your preferences
              and choices stay in this browser, so a refresh will not lose them.
            </p>
          </>
        )}
      </section>

      <MyRecipesSection />
      <DiscoverSection />
      <SafetyDisclaimer />
    </>
  )
}
