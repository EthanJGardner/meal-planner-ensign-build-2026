import { HouseholdProvider } from '../contexts/HouseholdProvider'
import { MealPlanProvider } from '../contexts/MealPlanProvider'
import { useMealPlan } from '../hooks/useMealPlan'
import { Banner } from '../components/common/Banner'
import { LoadingState } from '../components/common/LoadingState'
import { SafetyDisclaimer } from '../components/common/SafetyDisclaimer'
import { HouseholdSetup } from '../components/household/HouseholdSetup'
import { PlanBoard } from '../components/plan/PlanBoard'
import { PlanSummary } from '../components/plan/PlanSummary'
import { GroceryList } from '../components/grocery/GroceryList'
import './Home.css'

function HomeContent() {
  const { plan, status, error, notice, clearPlan } = useMealPlan()

  return (
    <main className="home">
      <header className="home__hero">
        <p className="home__eyebrow">FeedMe</p>
        <h1 className="home__title">Weekly meals your whole table can eat</h1>
        <p className="home__lede">
          Tell us the allergies, the budget, and how long you have to cook. We
          plan breakfast, lunch, and dinner for everyone, then build the grocery
          list.
        </p>
      </header>

      <HouseholdSetup />

      {error ? (
        <Banner variant="error" title="We could not build that plan">
          {error}
        </Banner>
      ) : null}

      {notice ? (
        <Banner variant="notice" title="Sample data">
          {notice}
        </Banner>
      ) : null}

      {status === 'loading' ? (
        <LoadingState label="Building a plan around your allergies and budget…" />
      ) : null}

      {plan ? (
        <>
          <PlanSummary />
          <PlanBoard />
          <GroceryList />
          <div className="home__reset">
            <button type="button" className="button" onClick={clearPlan}>
              Clear this plan
            </button>
          </div>
        </>
      ) : (
        status !== 'loading' && (
          <section className="panel panel--empty">
            <h2 className="panel__title">No plan yet</h2>
            <p className="panel__empty">
              Fill in your household above and generate a plan. Your preferences
              and choices stay in this browser, so a refresh will not lose them.
            </p>
          </section>
        )
      )}

      <SafetyDisclaimer />
    </main>
  )
}

export default function Home() {
  return (
    <HouseholdProvider>
      <MealPlanProvider>
        <HomeContent />
      </MealPlanProvider>
    </HouseholdProvider>
  )
}
