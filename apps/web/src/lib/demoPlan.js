// Requirement 7.2: the sample-data path used when the planner service is
// unavailable. It runs the same generator the live plan does, only against the
// bundled catalog, so the avoid list and diet filtering behave identically.

import { SAMPLE_RECIPES } from './sampleRecipes.js'
import { sanitizePlanDates } from './dates.js'
import { mergeCustomRecipes } from './customRecipes.js'
import { fillsSlot, isRecipeCompliant } from './mealFilters.js'
import { createEmptyPlan, generateDays, recipeCostPerServing } from './planner.js'

const sampleCatalog = () =>
  SAMPLE_RECIPES.map((recipe) => ({
    ...recipe,
    nutritionSource: 'Estimated from sample recipe macros',
    source: 'sample',
  }))

// Requirement 5.8: the user's own recipes are part of the catalog the generator
// draws from, so a submitted recipe can be planned like any other.
export function emptyDemoPlan(customRecipes = []) {
  return createEmptyPlan(mergeCustomRecipes(sampleCatalog(), customRecipes))
}

export function generateDemoPlan(preferences, customRecipes = []) {
  const dates = sanitizePlanDates(preferences.planDates ?? [])

  if (!dates.length) {
    throw new Error(
      'Pick the days you want on the calendar in Setup, then build the plan.',
    )
  }

  const base = emptyDemoPlan(customRecipes)
  const result = generateDays(base, preferences, { dates })

  if (result.error) throw new Error(result.error)

  return { ...base, days: result.days, warnings: result.warnings }
}

// A local stand-in for the planner's alternative endpoint.
export function demoAlternative(plan, name, slot, preferences, excludeNames = []) {
  const current = plan.recipes.find((recipe) => recipe.name === name)

  const candidates = plan.recipes.filter(
    (recipe) =>
      recipe.name !== name &&
      !excludeNames.includes(recipe.name) &&
      fillsSlot(recipe, slot) &&
      isRecipeCompliant(recipe, preferences),
  )

  if (!candidates.length) return null

  const target = current?.nutritionPerServing?.calories ?? 0
  const rank = (recipe) =>
    Math.abs((recipe.nutritionPerServing?.calories ?? 0) - target) +
    recipeCostPerServing(recipe) * 5

  return [...candidates].sort((a, b) => rank(a) - rank(b))[0]
}
