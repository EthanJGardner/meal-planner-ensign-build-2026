import { useState } from 'react'
import { prepTimeLabel } from '../../lib/constants'
import { planRangeLabel } from '../../lib/dates'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { usePlanSummary } from '../../hooks/usePlanSummary'
import { Banner } from '../common/Banner'
import { SafetyDisclaimer } from '../common/SafetyDisclaimer'
import { RecipeFormModal } from '../recipes/RecipeFormModal'
import { PlanSummary } from './PlanSummary'
import { PlanTable } from './PlanTable'
import { RecipeModal } from './RecipeModal'

export function PlanView({ onEditSetup, onGoToGrocery }) {
  const { preferences } = useHousehold()
  const {
    dates,
    empty,
    confirmedDates,
    note,
    error,
    notice,
    canUndo,
    undo,
    regeneratePlan,
    clearPlan,
    fitToBudget,
    confirmPlan,
    publishPlan,
    dismissNote,
    dismissError,
  } = useMealPlan()

  const [openRecipe, setOpenRecipe] = useState(null)
  const [editRecipe, setEditRecipe] = useState(null)
  const summary = usePlanSummary()

  const confirmed = Boolean(confirmedDates?.length)
  const avoid = preferences.avoid ?? []
  const picked = preferences.planDates?.length ?? 0

  return (
    <>
      <h1 className="page-title">Your meal plan</h1>

      <div className="summary-strip">
        <p className="summary-strip__text">
          {preferences.householdSize}{' '}
          {preferences.householdSize === 1 ? 'person' : 'people'} · {picked}{' '}
          {picked === 1 ? 'day' : 'days'} (
          {planRangeLabel(preferences.planDates ?? [])}) · $
          {preferences.budget} ·{' '}
          {avoid.length ? `No ${avoid.join(', ')}` : 'Nothing ruled out'}
          {preferences.dietaryRestrictions.length
            ? ` · ${preferences.dietaryRestrictions.join(', ')}`
            : ''}{' '}
          · Prep: {prepTimeLabel(preferences.cookingTime).toLowerCase()}
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
          {summary.budget
            ? summary.overBudget
              ? ` · over by $${summary.overBudgetBy.toFixed(2)}`
              : ' · within budget'
            : ''}
        </p>

        <button type="button" className="button button--accent" onClick={fitToBudget}>
          Fit to budget
        </button>
        <button type="button" className="button" onClick={publishPlan}>
          Share this plan
        </button>
        <button type="button" className="button" onClick={() => regeneratePlan()}>
          Remake every day
        </button>
        <button type="button" className="button" onClick={clearPlan}>
          Clear the plan
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setEditRecipe({ recipe: null })}
        >
          Add your own recipe
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

      {summary.swaps.length ? (
        <Banner variant="notice" title="Ingredients we swapped">
          <ul className="swap-list">
            {summary.swaps.map((swap) => (
              <li key={`${swap.meal}-${swap.from}-${swap.to}`}>
                We swapped {swap.from} for {swap.to}{' '}
                <span className="swap-list__meal">in {swap.meal}</span>
              </li>
            ))}
          </ul>
          Check the labels on the replacements before you cook.
        </Banner>
      ) : null}

      {note ? (
        <Banner variant="notice" title="What changed" onDismiss={dismissNote}>
          {note}
          {canUndo ? (
            <p className="banner__action">
              <button type="button" className="button button--small" onClick={undo}>
                Undo that change
              </button>
            </p>
          ) : null}
        </Banner>
      ) : null}

      {empty && !dates.length ? (
        <section className="panel panel--empty">
          <h2 className="panel__title">Nothing planned yet</h2>
          <p className="panel__lede">
            Pick the days you want on the calendar in Setup, then build a plan
            from them, or copy one from someone with a lifestyle like yours in
            Discover.
          </p>
          <button
            type="button"
            className="button button--primary button--large"
            onClick={onEditSetup}
          >
            Back to setup
          </button>
        </section>
      ) : (
        <>
          <PlanSummary />
          <PlanTable onOpenRecipe={setOpenRecipe} />

          <div className="confirm-bar">
            <div>
              <h2 className="confirm-bar__title">
                {confirmed ? 'This plan is confirmed' : 'Happy with this plan?'}
              </h2>
              <p className="confirm-bar__lede">
                {confirmed
                  ? `Your grocery list is built from the ${confirmedDates.length} ${
                      confirmedDates.length === 1 ? 'day' : 'days'
                    } you confirmed. Change a meal and it updates.`
                  : 'Confirm it to turn these meals into a grocery list you can check out.'}
              </p>
            </div>
            <div className="confirm-bar__actions">
              <button
                type="button"
                className="button button--primary button--large"
                onClick={confirmPlan}
                disabled={Boolean(summary.problemDays.length) || empty}
              >
                {confirmed ? 'Re-confirm this plan' : 'Confirm this plan'}
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
            Every day you picked gets its own row, in date order, with today
            marked. Add or remove days on the calendar in Setup.
          </li>
          <li>
            Pick a recipe or a Leftovers option for any meal. Leftovers come
            from a meal cooked the day before.
          </li>
          <li>
            The small box beside each meal is the number of people. Leave it
            blank to use your household size.
          </li>
          <li>
            Change what you cannot have, or a diet, in Setup and unsafe meals
            are swapped automatically, with a note telling you what moved.
          </li>
          <li>
            Where one ingredient is the only problem, we swap that ingredient
            instead of the whole meal and say so above the plan.
          </li>
          <li>
            Red text in Check means something needs fixing. The grey line is
            calories and protein per person for that day.
          </li>
        </ul>
      </section>

      <SafetyDisclaimer />

      {openRecipe ? (
        <RecipeModal
          {...openRecipe}
          onClose={() => setOpenRecipe(null)}
          onEditRecipe={(recipe) => {
            setOpenRecipe(null)
            setEditRecipe({ recipe })
          }}
        />
      ) : null}

      {editRecipe ? (
        <RecipeFormModal
          recipe={editRecipe.recipe}
          onClose={() => setEditRecipe(null)}
        />
      ) : null}
    </>
  )
}
