import { useMemo } from 'react'
import { MEAL_SLOTS, WEEK_DAYS } from '../lib/constants'
import {
  allowedWeekBudget,
  dayIssues,
  dayNutrition,
  findRecipe,
  plannedDayCount,
  weekCost,
} from '../lib/planner'
import { useHousehold } from './useHousehold'
import { useMealPlan } from './useMealPlan'

const round = (value) => Math.round(value * 100) / 100

// Requirement 5.3: aggregated nutrition and cost for the week on screen,
// measured against the user's goals and budget.
export function usePlanSummary(week) {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  return useMemo(() => {
    const calorieGoal = Number(preferences.nutritionGoals?.calories) || 0
    const proteinGoal = Number(preferences.nutritionGoals?.protein) || 0
    const servings = Math.max(1, Number(preferences.householdSize) || 1)

    if (!plan) {
      return {
        plannedDays: 0,
        filledSlots: 0,
        totalSlots: 0,
        cost: 0,
        allowedBudget: 0,
        overBudget: false,
        overBudgetBy: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        calorieGoal,
        proteinGoal,
        servings,
        problemDays: [],
        savedCount: 0,
        warnings: [],
        source: null,
      }
    }

    const days = plan.weeks[week]
    const plannedDays = plannedDayCount(plan, week)

    let calories = 0
    let protein = 0
    let carbs = 0
    let fat = 0
    let filledSlots = 0
    let savedCount = 0
    const problemDays = []

    days.forEach((day, dayIndex) => {
      const nutrition = dayNutrition(plan, week, dayIndex)
      calories += nutrition.calories
      protein += nutrition.protein
      filledSlots += nutrition.filled

      for (const slot of day) {
        if (slot.saved) savedCount += 1
        const recipe = findRecipe(plan, slot.recipe)
        if (!recipe?.nutritionPerServing) continue
        carbs += recipe.nutritionPerServing.carbs ?? 0
        fat += recipe.nutritionPerServing.fat ?? 0
      }

      if (dayIssues(plan, week, dayIndex, preferences).length) {
        problemDays.push(WEEK_DAYS[dayIndex])
      }
    })

    // Macros are stored per serving, so dividing by the planned days gives one
    // person's daily intake.
    const divisor = Math.max(plannedDays, 1)
    const cost = weekCost(plan, week, preferences)
    const allowed = allowedWeekBudget(plan, week, preferences)

    return {
      plannedDays,
      filledSlots,
      totalSlots: days.length * MEAL_SLOTS.length,
      cost,
      allowedBudget: allowed,
      overBudget: allowed > 0 && cost > allowed,
      overBudgetBy: allowed > 0 ? round(Math.max(0, cost - allowed)) : 0,
      calories: Math.round(calories / divisor),
      protein: Math.round(protein / divisor),
      carbs: Math.round(carbs / divisor),
      fat: Math.round(fat / divisor),
      calorieGoal,
      proteinGoal,
      servings,
      problemDays,
      savedCount,
      warnings: plan.warnings ?? [],
      source: plan.source ?? null,
    }
  }, [plan, preferences, week])
}
