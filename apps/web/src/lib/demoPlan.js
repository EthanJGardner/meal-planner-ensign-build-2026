import { MEAL_STATUS, MEAL_TYPES } from './constants'
import { SAMPLE_RECIPES } from './sampleRecipes'

const round = (n, places = 2) => {
  const factor = 10 ** places
  return Math.round(n * factor) / factor
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`

// Allergies are never relaxed, so this filter is applied separately from the
// preference filters below and always runs first.
const isAllergySafe = (recipe, allergies) =>
  !recipe.allergens.some((allergen) => allergies.includes(allergen))

const matchesRestrictions = (recipe, restrictions) =>
  restrictions.every((restriction) => recipe.tags.includes(restriction))

const matchesCookingTime = (recipe, cookingTime) =>
  !cookingTime || recipe.cookTimeMinutes <= cookingTime

function buildMeal(recipe, { mealType, day, servings }) {
  const ingredients = recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: round(ingredient.quantity * servings),
    unit: ingredient.unit,
    estimatedCost: round(ingredient.cost * servings),
  }))

  const nutrition = {
    calories: Math.round(recipe.nutritionPerServing.calories),
    protein: Math.round(recipe.nutritionPerServing.protein),
    carbs: Math.round(recipe.nutritionPerServing.carbs),
    fat: Math.round(recipe.nutritionPerServing.fat),
  }

  return {
    id: newId(),
    name: recipe.name,
    mealType,
    day,
    servings,
    cookTimeMinutes: recipe.cookTimeMinutes,
    ingredients,
    instructions: recipe.instructions,
    nutritionPerServing: nutrition,
    estimatedCost: round(
      ingredients.reduce((sum, item) => sum + item.estimatedCost, 0),
    ),
    allergens: recipe.allergens,
    tags: recipe.tags,
    nutritionSource: 'Estimated from sample recipe macros',
    status: MEAL_STATUS.PENDING,
    saved: false,
  }
}

function buildPools(preferences) {
  const { allergies, dietaryRestrictions, cookingTime } = preferences
  const warnings = []
  const pools = {}

  for (const mealType of MEAL_TYPES) {
    const safe = SAMPLE_RECIPES.filter(
      (recipe) =>
        recipe.mealType === mealType && isAllergySafe(recipe, allergies),
    )

    let pool = safe.filter(
      (recipe) =>
        matchesRestrictions(recipe, dietaryRestrictions) &&
        matchesCookingTime(recipe, cookingTime),
    )

    if (!pool.length) {
      pool = safe.filter((recipe) =>
        matchesRestrictions(recipe, dietaryRestrictions),
      )
      if (pool.length) {
        warnings.push(
          `No allergy-safe ${mealType} option fits your cooking-time limit, so the limit was relaxed for ${mealType}.`,
        )
      }
    }

    if (!pool.length) {
      pool = safe
      if (pool.length) {
        warnings.push(
          `No ${mealType} option matched every dietary restriction, so the closest allergy-safe ${mealType} options were used instead. Review them before cooking.`,
        )
      }
    }

    pools[mealType] = pool
  }

  return { pools, warnings }
}

function fitToBudget(meals, pools, budget, servings) {
  const warnings = []
  if (!budget) return { meals, warnings }

  const planned = [...meals]
  const total = () => planned.reduce((sum, meal) => sum + meal.estimatedCost, 0)
  const used = new Set(planned.map((meal) => meal.name))

  while (total() > budget) {
    const priciestIndex = planned.reduce(
      (worst, meal, index) =>
        meal.estimatedCost > planned[worst].estimatedCost ? index : worst,
      0,
    )
    const target = planned[priciestIndex]

    const cheaper = pools[target.mealType]
      .filter((recipe) => !used.has(recipe.name))
      .map((recipe) =>
        buildMeal(recipe, {
          mealType: target.mealType,
          day: target.day,
          servings,
        }),
      )
      .filter((meal) => meal.estimatedCost < target.estimatedCost)
      .sort((a, b) => a.estimatedCost - b.estimatedCost)[0]

    if (!cheaper) break

    used.delete(target.name)
    used.add(cheaper.name)
    planned[priciestIndex] = cheaper
  }

  if (total() > budget) {
    warnings.push(
      `The cheapest allergy-safe plan we could build costs about $${round(total()).toFixed(2)}, which is over your $${budget} budget. Lower the planning period or raise the budget.`,
    )
  }

  return { meals: planned, warnings }
}

function alternativesFor(meal, pools, servings) {
  return pools[meal.mealType]
    .filter((recipe) => recipe.name !== meal.name)
    .slice(0, 3)
    .map((recipe) =>
      buildMeal(recipe, {
        mealType: meal.mealType,
        day: meal.day,
        servings,
      }),
    )
}

export function generateDemoPlan(preferences) {
  const servings = Math.max(1, Number(preferences.householdSize) || 1)
  const days = Math.max(1, Number(preferences.planningPeriod) || 1)
  const { pools, warnings } = buildPools(preferences)

  const missing = MEAL_TYPES.filter((mealType) => !pools[mealType].length)
  if (missing.length) {
    throw new Error(
      `No allergy-safe sample ${missing.join(' or ')} recipes are available for this combination of allergies. Remove an allergy or try the live planner.`,
    )
  }

  const meals = []
  for (let day = 1; day <= days; day += 1) {
    for (const mealType of MEAL_TYPES) {
      const pool = pools[mealType]
      const recipe = pool[(day - 1) % pool.length]
      meals.push(buildMeal(recipe, { mealType, day, servings }))
    }
  }

  const budgeted = fitToBudget(
    meals,
    pools,
    Number(preferences.budget) || 0,
    servings,
  )

  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    source: 'sample-data',
    servings,
    planningPeriod: days,
    meals: budgeted.meals.map((meal) => ({
      ...meal,
      alternatives: alternativesFor(meal, pools, servings),
    })),
    warnings: [...warnings, ...budgeted.warnings],
  }
}

export function generateDemoAlternative(meal, preferences, excludeNames = []) {
  const servings = Math.max(1, Number(preferences.householdSize) || 1)
  const { pools } = buildPools(preferences)
  const pool = pools[meal.mealType] ?? []

  const candidates = pool.filter(
    (recipe) => recipe.name !== meal.name && !excludeNames.includes(recipe.name),
  )
  const recipe = (candidates.length ? candidates : pool)[0]

  if (!recipe) {
    throw new Error(
      `No allergy-safe sample ${meal.mealType} alternative is available.`,
    )
  }

  const replacement = buildMeal(recipe, {
    mealType: meal.mealType,
    day: meal.day,
    servings,
  })

  return {
    ...replacement,
    alternatives: alternativesFor(replacement, pools, servings),
  }
}
