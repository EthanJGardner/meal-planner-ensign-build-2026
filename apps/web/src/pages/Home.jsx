import { useState } from 'react'
import { CURRENT_WEEK } from '../lib/constants'
import { isWeekEmpty } from '../lib/planner'
import { HouseholdProvider } from '../contexts/HouseholdProvider'
import { MealPlanProvider } from '../contexts/MealPlanProvider'
import { useMealPlan } from '../hooks/useMealPlan'
import { AppHeader } from '../components/common/AppHeader'
import { SetupView } from '../components/setup/SetupView'
import { PlanView } from '../components/plan/PlanView'
import { GroceryView } from '../components/grocery/GroceryView'

function Shell() {
  const { plan } = useMealPlan()
  const [view, setView] = useState('setup')

  const groceryReady = plan.confirmedWeek !== null && plan.confirmedWeek !== undefined
  const hasPlan = !isWeekEmpty(plan, CURRENT_WEEK)

  // The plan step is only meaningful once something has been planned.
  const current = view === 'plan' && !hasPlan ? 'setup' : view

  return (
    <div className="app">
      <AppHeader view={current} onNavigate={setView} groceryReady={groceryReady} />

      <main className="app__main" id="main">
        {current === 'setup' ? (
          <SetupView onSeePlan={() => setView('plan')} />
        ) : null}

        {current === 'plan' ? (
          <PlanView
            onEditSetup={() => setView('setup')}
            onGoToGrocery={() => setView('grocery')}
          />
        ) : null}

        {current === 'grocery' ? (
          <GroceryView onBackToPlan={() => setView('plan')} />
        ) : null}
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <HouseholdProvider>
      <MealPlanProvider>
        <Shell />
      </MealPlanProvider>
    </HouseholdProvider>
  )
}
