import { usePlanSummary } from '../../hooks/usePlanSummary'
import { Banner } from '../common/Banner'

function Stat({ label, value, detail, variant = '' }) {
  return (
    <div className={`stat ${variant ? `stat--${variant}` : ''}`}>
      <dt className="stat__label">{label}</dt>
      <dd className="stat__value">{value}</dd>
      {detail ? <p className="stat__detail">{detail}</p> : null}
    </div>
  )
}

export function PlanSummary() {
  const summary = usePlanSummary()

  const calorieDelta = summary.calorieGoal
    ? summary.perPersonPerDay.calories - summary.calorieGoal
    : null
  const proteinDelta = summary.proteinGoal
    ? summary.perPersonPerDay.protein - summary.proteinGoal
    : null

  const describeDelta = (delta, unit) => {
    if (delta === null) return 'No goal set'
    if (delta === 0) return 'On target'
    return delta > 0
      ? `${delta}${unit} over your goal`
      : `${Math.abs(delta)}${unit} under your goal`
  }

  return (
    <section className="panel" id="summary" aria-labelledby="summary-title">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="summary-title">
            Plan summary
          </h2>
          <p className="panel__subtitle">
            Totals cover the {summary.acceptedCount} accepted{' '}
            {summary.acceptedCount === 1 ? 'meal' : 'meals'} for{' '}
            {summary.servings}{' '}
            {summary.servings === 1 ? 'person' : 'people'}.
          </p>
        </div>
      </header>

      {summary.warnings.map((warning) => (
        <Banner key={warning} variant="warning" title="Constraint">
          {warning}
        </Banner>
      ))}

      {summary.overBudget ? (
        <Banner variant="warning" title="Over budget">
          The accepted meals cost ${summary.totalCost.toFixed(2)}, which is $
          {Math.abs(summary.budgetRemaining).toFixed(2)} over your $
          {summary.budget} budget. Reject a costly meal or swap it for a cheaper
          alternative.
        </Banner>
      ) : null}

      <dl className="stat-grid">
        <Stat
          label="Meals accepted"
          value={`${summary.acceptedCount} / ${summary.totalMeals}`}
          detail={
            summary.pendingCount
              ? `${summary.pendingCount} still awaiting a decision`
              : 'Every meal has a decision'
          }
        />
        <Stat
          label="Est. grocery cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          detail={
            summary.budget
              ? summary.overBudget
                ? `Over your $${summary.budget} budget`
                : `$${summary.budgetRemaining.toFixed(2)} left of $${summary.budget}`
              : 'No budget set'
          }
          variant={summary.overBudget ? 'alert' : ''}
        />
        <Stat
          label="Calories per person/day"
          value={summary.hasNutrition ? summary.perPersonPerDay.calories : '—'}
          detail={describeDelta(calorieDelta, ' cal')}
        />
        <Stat
          label="Protein per person/day"
          value={
            summary.hasNutrition ? `${summary.perPersonPerDay.protein}g` : '—'
          }
          detail={describeDelta(proteinDelta, 'g')}
        />
        <Stat
          label="Carbs / fat per person/day"
          value={
            summary.hasNutrition
              ? `${summary.perPersonPerDay.carbs}g / ${summary.perPersonPerDay.fat}g`
              : '—'
          }
          detail="Estimated from recipe macros"
        />
        <Stat
          label="Days covered"
          value={`${summary.daysWithMeals} / ${summary.planningPeriod}`}
          detail={`${summary.savedCount} meals hearted`}
        />
      </dl>

      {summary.hasNutrition &&
      summary.nutritionCoverage.counted < summary.nutritionCoverage.total ? (
        <p className="panel__footnote">
          Nutrition totals cover {summary.nutritionCoverage.counted} of{' '}
          {summary.nutritionCoverage.total} accepted meals; the rest had no
          estimate available.
        </p>
      ) : null}
    </section>
  )
}
