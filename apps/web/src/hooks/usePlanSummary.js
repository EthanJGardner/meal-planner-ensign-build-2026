import { useMemo } from 'react'
import { MEAL_SLOTS } from '../lib/constants'
import { shortDateISO } from '../lib/dates'
import {
  dayIssues,
  dayNutrition,
  findRecipe,
  planCost,
  plannedDates,
} from '../lib/planner'
import { hasSwaps } from '../lib/substitutions'
import { useHousehold } from './useHousehold'
import { useMealPlan } from './useMealPlan'

const round = (value) => Math.round(value * 100) / 100

// Requirement 5.3: aggregated nutrition and cost for the whole plan, measured
// against the user's goals and budget.
export function usePlanSummary() {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  return useMemo(() => {
    const calorieGoal = Number(preferences.nutritionGoals?.calories) || 0
    const proteinGoal = Number(preferences.nutritionGoals?.protein) || 0
    const servings = Math.max(1, Number(preferences.householdSize) || 1)
    const budget = Number(preferences.budget) || 0

    const dates = plan ? plannedDates(plan) : []

    let calories = 0
    let protein = 0
    let carbs = 0
    let fat = 0
    let filledSlots = 0
    let savedCount = 0
    const problemDays = []
    // Requirement 5.4: every ingredient swap in the plan, so the user is told
    // what we changed rather than finding it in the recipe later.
    const swaps = new Map()

    for (const date of dates) {
      const nutrition = dayNutrition(plan, date)
      calories += nutrition.calories
      protein += nutrition.protein
      filledSlots += nutrition.filled

      for (const slot of plan.days[date]) {
        if (slot.saved) savedCount += 1
        const recipe = findRecipe(plan, slot.recipe)

        if (hasSwaps(recipe)) {
          for (const swap of recipe.swaps) {
            swaps.set(`${recipe.name}|${swap.from}|${swap.to}`, {
              meal: recipe.name,
              from: swap.from,
              to: swap.to,
            })
          }
        }

        if (!recipe?.nutritionPerServing) continue
        carbs += recipe.nutritionPerServing.carbs ?? 0
        fat += recipe.nutritionPerServing.fat ?? 0
      }

      if (dayIssues(plan, date, preferences).length) {
        problemDays.push(shortDateISO(date))
      }
    }

    // Macros are stored per serving, so dividing by the planned days gives one
    // person's daily intake.
    const divisor = Math.max(dates.length, 1)
    const cost = plan ? planCost(plan, preferences) : 0

    return {
      dates,
      plannedDays: dates.length,
      filledSlots,
      totalSlots: dates.length * MEAL_SLOTS.length,
      cost,
      budget,
      overBudget: budget > 0 && cost > budget,
      overBudgetBy: budget > 0 ? round(Math.max(0, cost - budget)) : 0,
      calories: Math.round(calories / divisor),
      protein: Math.round(protein / divisor),
      carbs: Math.round(carbs / divisor),
      fat: Math.round(fat / divisor),
      calorieGoal,
      proteinGoal,
      servings,
      problemDays,
      savedCount,
      swaps: [...swaps.values()],
      warnings: plan?.warnings ?? [],
      source: plan?.source ?? null,
    }
  }, [plan, preferences])
}
