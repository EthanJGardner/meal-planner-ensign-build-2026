import { useMemo } from 'react'
import { MEAL_STATUS } from '../lib/constants'
import { useHousehold } from './useHousehold'
import { useMealPlan } from './useMealPlan'

const round = (n) => Math.round(n * 100) / 100

export function usePlanSummary() {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  return useMemo(() => {
    const meals = plan?.meals ?? []
    const accepted = meals.filter(
      (meal) => meal.status === MEAL_STATUS.ACCEPTED,
    )

    const budget = Number(preferences.budget) || 0
    const totalCost = round(
      accepted.reduce((sum, meal) => sum + (meal.estimatedCost ?? 0), 0),
    )

    const withNutrition = accepted.filter((meal) => meal.nutritionPerServing)
    const daysWithMeals = new Set(accepted.map((meal) => meal.day)).size || 1

    const macroTotals = withNutrition.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.nutritionPerServing.calories ?? 0),
        protein: totals.protein + (meal.nutritionPerServing.protein ?? 0),
        carbs: totals.carbs + (meal.nutritionPerServing.carbs ?? 0),
        fat: totals.fat + (meal.nutritionPerServing.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )

    // Macros are stored per serving, so dividing by the number of planned days
    // gives one person's daily intake.
    const perPersonPerDay = {
      calories: Math.round(macroTotals.calories / daysWithMeals),
      protein: Math.round(macroTotals.protein / daysWithMeals),
      carbs: Math.round(macroTotals.carbs / daysWithMeals),
      fat: Math.round(macroTotals.fat / daysWithMeals),
    }

    return {
      totalMeals: meals.length,
      acceptedCount: accepted.length,
      pendingCount: meals.filter(
        (meal) => meal.status === MEAL_STATUS.PENDING,
      ).length,
      rejectedCount: meals.filter(
        (meal) => meal.status === MEAL_STATUS.REJECTED,
      ).length,
      savedCount: meals.filter((meal) => meal.saved).length,
      servings: plan?.servings ?? (Number(preferences.householdSize) || 1),
      daysWithMeals: accepted.length ? daysWithMeals : 0,
      planningPeriod: plan?.planningPeriod ?? preferences.planningPeriod,
      totalCost,
      budget,
      budgetRemaining: round(budget - totalCost),
      overBudget: budget > 0 && totalCost > budget,
      perPersonPerDay,
      hasNutrition: withNutrition.length > 0,
      nutritionCoverage: {
        counted: withNutrition.length,
        total: accepted.length,
      },
      calorieGoal: Number(preferences.nutritionGoals.calories) || 0,
      proteinGoal: Number(preferences.nutritionGoals.protein) || 0,
      warnings: plan?.warnings ?? [],
      source: plan?.source ?? null,
    }
  }, [plan, preferences])
}
