import { useState } from 'react'
import { CURRENT_WEEK, cookingTimeLabel } from '../../lib/constants'
import { isWeekEmpty } from '../../lib/planner'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { usePlanSummary } from '../../hooks/usePlanSummary'
import { Banner } from '../common/Banner'
import { SafetyDisclaimer } from '../common/SafetyDisclaimer'
import { PlanSummary } from './PlanSummary'
import { PlanTable } from './PlanTable'
import { RecipeModal } from './RecipeModal'
import { WeekTabs } from './WeekTabs'

const weekStatus = (week) => {
  if (week < CURRENT_WEEK) {
    return 'Week 1 is done. The meals from that week are kept here as a record.'
  }
  if (week === CURRENT_WEEK) {
    return 'This is the week built from your setup. Change a dinner and the next day’s leftovers follow it.'
  }
  return `Week ${week + 1} is planned ahead, with leftovers carried over from the week before.`
}

export function PlanView({ onEditSetup, onGoToGrocery }) {
  const { preferences } = useHousehold()
  const {
    plan,
    currentWeek,
    note,
    error,
    notice,
    canUndo,
    undoWeek,
    undo,
    regenerateWeek,
    clearWeek,
    fitToBudget,
    confirmWeek,
    publishWeek,
    dismissNote,
    dismissError,
  } = useMealPlan()

  const [openRecipe, setOpenRecipe] = useState(null)
  const summary = usePlanSummary(currentWeek)

  const empty = isWeekEmpty(plan, currentWeek)
  const confirmed = plan.confirmedWeek === currentWeek

  const avoiding = preferences.allergies.length
    ? `Avoiding ${preferences.allergies.join(', ')}`
    : 'No allergies'

  return (
    <>
      <h1 className="page-title">Your meal plan</h1>

      <div className="summary-strip">
        <p className="summary-strip__text">
          {preferences.householdSize}{' '}
          {preferences.householdSize === 1 ? 'person' : 'people'} ·{' '}
          {preferences.planningPeriod} days · ${preferences.budget} ·{' '}
          {avoiding}
          {preferences.dietaryRestrictions.length
            ? ` · ${preferences.dietaryRestrictions.join(', ')}`
            : ''}{' '}
          · {cookingTimeLabel(preferences.cookingTime)}
        </p>
        <button type="button" className="button button--small" onClick={onEditSetup}>
          Edit setup
        </button>
      </div>

      <div className="action-bar">
        <p
          className={`action-bar__cost${
            summary.overBudget ? ' is-over' : summary.cost ? ' is-ok' : ''
          }`}
        >
          Estimated cost ${summary.cost.toFixed(2)}
          {summary.allowedBudget
            ? summary.overBudget
              ? ` · over by $${summary.overBudgetBy.toFixed(2)}`
              : ' · within budget'
            : ''}
        </p>

        <button type="button" className="button button--accent" onClick={() => fitToBudget(currentWeek)}>
          Fit to budget
        </button>
        <button type="button" className="button" onClick={() => publishWeek(currentWeek)}>
          Share this week
        </button>
        <button type="button" className="button" onClick={() => regenerateWeek(currentWeek)}>
          Remake this week
        </button>
        <button type="button" className="button" onClick={() => clearWeek(currentWeek)}>
          Clear this week
        </button>
      </div>

      {error ? (
        <Banner variant="error" title="Something went wrong" onDismiss={dismissError}>
          {error}
        </Banner>
      ) : null}

      {notice ? (
        <Banner variant="notice" title="Sample data">
          {notice}
        </Banner>
      ) : null}

      {summary.warnings.map((warning) => (
        <Banner key={warning} variant="warning" title="Heads up">
          {warning}
        </Banner>
      ))}

      {note ? (
        <Banner variant="notice" title="What changed" onDismiss={dismissNote}>
          {note}
          {canUndo ? (
            <p className="banner__action">
              <button type="button" className="button button--small" onClick={undo}>
                Undo the change to Week {undoWeek + 1}
              </button>
            </p>
          ) : null}
        </Banner>
      ) : null}

      <WeekTabs />
      <p className="week-status">{weekStatus(currentWeek)}</p>

      {empty ? (
        <section className="panel panel--empty">
          <h2 className="panel__title">Nothing planned for this week yet</h2>
          <p className="panel__lede">
            Build it from your setup, or copy a week from someone with a
            lifestyle like yours in Discover.
          </p>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={() => regenerateWeek(currentWeek)}
          >
            Generate this week
          </button>
        </section>
      ) : (
        <>
          <PlanSummary week={currentWeek} />
          <PlanTable week={currentWeek} onOpenRecipe={setOpenRecipe} />

          <div className="confirm-bar">
            <div>
              <h2 className="confirm-bar__title">
                {confirmed ? 'This week is confirmed' : 'Happy with this week?'}
              </h2>
              <p className="confirm-bar__lede">
                {confirmed
                  ? 'Your grocery list is built from these meals. Change a meal and it updates.'
                  : 'Confirm it to turn these meals into a grocery list you can check out.'}
              </p>
            </div>
            <div className="confirm-bar__actions">
              <button
                type="button"
                className="button button--primary button--large"
                onClick={() => confirmWeek(currentWeek)}
                disabled={Boolean(summary.problemDays.length)}
              >
                {confirmed ? 'Re-confirm this week' : 'Confirm this week'}
              </button>
              {confirmed ? (
                <button type="button" className="button" onClick={onGoToGrocery}>
                  Go to grocery list
                </button>
              ) : null}
            </div>
          </div>

          {summary.problemDays.length ? (
            <p className="fine-print fine-print--alert">
              Fix the days marked in the Check column before confirming:{' '}
              {summary.problemDays.join(', ')}.
            </p>
          ) : null}
        </>
      )}

      <section className="how-to">
        <h2 className="how-to__title">How to use this</h2>
        <ul className="how-to__list">
          <li>
            Pick a recipe or a Leftovers option for any meal. Leftovers come from
            a meal cooked earlier in the plan.
          </li>
          <li>
            The small box beside each meal is the number of people. Leave it
            blank to use your household size.
          </li>
          <li>
            Change an allergy or diet in Setup and unsafe meals are swapped
            automatically, with a note telling you what moved.
          </li>
          <li>
            Red text in Check means something needs fixing. The grey line is
            calories and protein per person for that day.
          </li>
        </ul>
      </section>

      <SafetyDisclaimer />

      {openRecipe ? (
        <RecipeModal {...openRecipe} onClose={() => setOpenRecipe(null)} />
      ) : null}
    </>
  )
}
