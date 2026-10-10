import logo from '../../assets/pic-logo.png'
import { planRangeLabel } from '../../lib/dates'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { AvoidSelector } from '../household/AvoidSelector'
import { PreferencesForm } from '../household/PreferencesForm'
import { Banner } from '../common/Banner'
import { LoadingState } from '../common/LoadingState'
import { SafetyDisclaimer } from '../common/SafetyDisclaimer'
import { DiscoverSection } from '../discover/DiscoverSection'
import { MyRecipesSection } from '../recipes/MyRecipesSection'

const BUILD_STEPS = [
  'Reading your setup and the ingredients you cannot have…',
  'Finding recipes everyone at your table can eat…',
  'Balancing calories, protein and your budget…',
  'Laying the meals out across the days you picked…',
  'Checking every ingredient one last time…',
]

export function SetupView({ onSeePlan }) {
  const { preferences, resetPreferences } = useHousehold()
  const { empty, status, error, notice, note, generatePlan, dismissError } =
    useMealPlan()

  const loading = status === 'loading'
  const hasPlan = !empty
  const days = preferences.planDates?.length ?? 0

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
        <h1 className="hero__title">Meals your whole table can eat</h1>
        <p className="hero__lede">
          Tell us what nobody can have, the budget, and which days you want
          covered. We plan breakfast, lunch and dinner for everyone, then turn
          it into a grocery list.
        </p>
      </section>

      <section className="panel" aria-labelledby="household-title">
        <h2 className="panel__title" id="household-title">
          Your household
        </h2>
        <p className="panel__lede">
          What you cannot eat comes first, then the days you want planned and
          everything else we need to build the plan.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            generatePlan()
          }}
        >
          <AvoidSelector />
          <PreferencesForm />

          {days ? null : (
            <p className="fine-print fine-print--alert">
              Pick at least one day on the calendar above before we can build a
              plan.
            </p>
          )}

          <div className="panel__actions">
            <button
              type="submit"
              className="button button--primary button--large"
              disabled={loading || !days}
            >
              {loading
                ? 'Building your plan…'
                : hasPlan
                  ? 'Rebuild my plan'
                  : 'Build my meal plan'}
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

      {/* While the plan is being built there is nothing useful to say about
          whether one exists, so the progress panel takes that slot rather than
          sitting above a "no plan yet" message that is about to be wrong. */}
      {loading ? (
        <section className="panel panel--next panel--busy" aria-busy="true">
          <h2 className="panel__title">Building your plan</h2>
          <LoadingState steps={BUILD_STEPS} />
        </section>
      ) : (
        <section className="panel panel--next">
          {hasPlan ? (
            <>
              <h2 className="panel__title">Your plan is ready</h2>
              <p className="panel__lede">
                {note ||
                  `Built for ${preferences.householdSize} ${
                    preferences.householdSize === 1 ? 'person' : 'people'
                  } on ${days} ${days === 1 ? 'day' : 'days'} (${planRangeLabel(
                    preferences.planDates ?? [],
                  )}).`}
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
                Fill in your household above and build a plan. Your preferences
                and choices stay in this browser, so a refresh will not lose
                them.
              </p>
            </>
          )}
        </section>
      )}

      <MyRecipesSection />
      <DiscoverSection />
      <SafetyDisclaimer />
    </>
  )
}
