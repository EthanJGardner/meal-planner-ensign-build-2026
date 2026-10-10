import { useState } from 'react'
import { CURRENT_WEEK } from '../lib/constants'
import { accountDefaults } from '../lib/accountSetup'
import { isWeekEmpty } from '../lib/planner'
import { accountPlanKey, accountPreferencesKey } from '../lib/storageKeys'
import { AccountSetupProvider } from '../contexts/AccountSetupProvider'
import { CustomRecipeProvider } from '../contexts/CustomRecipeProvider'
import { HouseholdProvider } from '../contexts/HouseholdProvider'
import { MealPlanProvider } from '../contexts/MealPlanProvider'
import { useAuth } from '../hooks/useAuth'
import { useMealPlan } from '../hooks/useMealPlan'
import { GuestImportPrompt } from '../components/account/GuestImportPrompt'
import { AppHeader } from '../components/common/AppHeader'
import { LoadingState } from '../components/common/LoadingState'
import { WelcomePopup } from '../components/common/WelcomePopup'
import { SetupView } from '../components/setup/SetupView'
import { PlanView } from '../components/plan/PlanView'
import { GroceryView } from '../components/grocery/GroceryView'

// Built once: HouseholdProvider memoizes against it.
const ACCOUNT_DEFAULTS = accountDefaults()

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

      <WelcomePopup />
      <GuestImportPrompt />
    </div>
  )
}

function GuestApp() {
  return (
    <HouseholdProvider>
      {/* The recipe book sits above the plan because the plan's catalog is
          layered on top of the user's own recipes. */}
      <CustomRecipeProvider>
        <MealPlanProvider>
          <Shell />
        </MealPlanProvider>
      </CustomRecipeProvider>
    </HouseholdProvider>
  )
}

// A signed-in user's Setup and plan live under their own storage keys, and
// sync with the account. Their own recipes stay in this browser's storage,
// shared with guest mode.
function AccountApp({ userId }) {
  return (
    <HouseholdProvider
      storageKey={accountPreferencesKey(userId)}
      defaults={ACCOUNT_DEFAULTS}
    >
      <AccountSetupProvider>
        <CustomRecipeProvider>
          <MealPlanProvider storageKey={accountPlanKey(userId)}>
            <Shell />
          </MealPlanProvider>
        </CustomRecipeProvider>
      </AccountSetupProvider>
    </HouseholdProvider>
  )
}

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingState label="Loading FeedMe…" />

  // Keyed so signing in, out or as someone else starts every provider afresh.
  return user ? <AccountApp key={user.id} userId={user.id} /> : <GuestApp key="guest" />
}
