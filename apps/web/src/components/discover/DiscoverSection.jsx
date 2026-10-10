import { useMemo } from 'react'
import {
  SHARED_DAILY_PLANS,
  SHARED_WEEKLY_PLANS,
  scoreSharedPlan,
} from '../../lib/sharedPlans'
import { useHousehold } from '../../hooks/useHousehold'
import { useMealPlan } from '../../hooks/useMealPlan'
import { SharedPlanCard } from './SharedPlanCard'

const STEPS = [
  {
    title: 'Discover',
    body: 'Browse meal plans published by people with a lifestyle like yours.',
  },
  {
    title: 'Copy',
    body: "Add someone's whole week, or just one day, to your own calendar.",
  },
  {
    title: 'Adjust',
    body: 'Copied meals are re-checked against your allergies, diet and budget, and swapped if they do not fit.',
  },
  {
    title: 'Share',
    body: 'Publish your own week so other households can start from it.',
  },
]

const CHALLENGES = [
  {
    title: 'Cold start',
    body: 'The feed needs plans before anyone can browse it. We seed it with sample plans so it is useful on day one.',
  },
  {
    title: 'Competition',
    body: 'Recipes are already everywhere. What is not: a whole week you can copy in one click, with leftovers, budget and allergy checks already done.',
  },
  {
    title: 'Accuracy',
    body: 'Shared plans can carry stale prices or wrong nutrition. Everything here is labelled an estimate and marked unverified.',
  },
  {
    title: 'Personalisation',
    body: 'No two households eat the same. Copying a plan runs it through your own setup before it lands in your calendar.',
  },
]

function PlanGrid({ plans }) {
  const { preferences } = useHousehold()
  const { plan } = useMealPlan()

  const ranked = useMemo(
    () =>
      [...plans]
        .map((shared) => ({
          shared,
          score: scoreSharedPlan(shared, plan.recipes, preferences).score,
        }))
        .sort((a, b) => b.score - a.score),
    [plan.recipes, plans, preferences],
  )

  return (
    <div className="card-grid">
      {ranked.map((entry, index) => (
        <SharedPlanCard
          key={entry.shared.id}
          shared={entry.shared}
          isClosest={index === 0}
        />
      ))}
    </div>
  )
}

export function DiscoverSection() {
  const { publishedPlans } = useMealPlan()

  const weekly = [...publishedPlans, ...SHARED_WEEKLY_PLANS]

  return (
    <section className="discover" id="discover">
      <h2 className="section-title">Plans from people like you</h2>
      <p className="section-lede">
        An AI can invent a recipe. What it cannot tell you is what a real
        household on your budget actually cooked last week. Both lists below are
        ranked by how closely each plan matches your household size, budget,
        allergies, diet and time per meal.
      </p>

      <ol className="steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className="step">
            <span className="step__number">{index + 1}</span>
            <h3 className="step__title">{step.title}</h3>
            <p className="step__body">{step.body}</p>
          </li>
        ))}
      </ol>

      <section className="discover__group">
        <h3 className="discover__group-title">One day at a time</h3>
        <p className="section-lede">
          For when you only need to fill tomorrow. Pick a day, read the recipes,
          and drop it into your week.
        </p>
        <PlanGrid plans={SHARED_DAILY_PLANS} />
      </section>

      <section className="discover__group">
        <h3 className="discover__group-title">A whole week</h3>
        <p className="section-lede">
          For when you want the planning done. Add a full week of meals to your
          calendar in one go.
        </p>
        <PlanGrid plans={weekly} />
      </section>

      <p className="fine-print">
        Sample people and plans with made-up prices. These are not real users.
      </p>

      <section className="challenges">
        <h3 className="challenges__title">What is hard about this, and our answer</h3>
        <div className="challenges__grid">
          {CHALLENGES.map((item) => (
            <div key={item.title} className="challenge">
              <h4 className="challenge__title">{item.title}</h4>
              <p className="challenge__body">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
