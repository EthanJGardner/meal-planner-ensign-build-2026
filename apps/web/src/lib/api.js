import { MEAL_STATUS, MEAL_TYPES } from './constants'
import { findDeclaredConflicts } from './allergySafety'

// Contract expected from the FastAPI backend:
//
// POST /api/meal-plan              { preferences } -> { plan }
// POST /api/meal-plan/alternative  { meal, preferences, excludeNames } -> { meal }
// POST /api/checkout/session       { items, total } -> { url }
//
// plan: { id, planningPeriod, servings, warnings?: string[], meals: Meal[] }
// Meal: { id, name, mealType, day, servings, cookTimeMinutes, estimatedCost,
//         ingredients: [{ name, quantity, unit, estimatedCost }],
//         instructions: string[], nutritionPerServing: { calories, protein,
//         carbs, fat }, nutritionSource?, allergens?: string[], tags?: string[],
//         alternatives?: Meal[] }

const REQUEST_TIMEOUT_MS = 60_000

const failure = (message, kind) => {
  const error = new Error(message)
  error.kind = kind
  return error
}

// 'unavailable' means the planner could not be reached and the sample-data path
// is allowed. 'invalid' means it answered with something we refuse to show.
const unavailable = (message) => failure(message, 'unavailable')
const invalid = (message) => failure(message, 'invalid')

async function postJson(path, body) {
  let response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw unavailable('The meal planner service could not be reached.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const detail =
      payload?.detail ?? payload?.message ?? `Request failed (${response.status})`
    throw response.status >= 500
      ? unavailable(detail)
      : invalid(typeof detail === 'string' ? detail : 'Request failed.')
  }

  return payload
}

function validateMeal(raw, index) {
  const where = `Meal ${index + 1}`

  if (!raw || typeof raw !== 'object') {
    throw invalid(`${where} was missing from the planner response.`)
  }
  if (!raw.name) throw invalid(`${where} has no name.`)
  if (!MEAL_TYPES.includes(raw.mealType)) {
    throw invalid(`${raw.name} has an unrecognized meal type.`)
  }
  if (!Array.isArray(raw.ingredients) || !raw.ingredients.length) {
    throw invalid(`${raw.name} has no ingredients.`)
  }
  if (raw.ingredients.some((item) => !item?.name || item.quantity == null)) {
    throw invalid(`${raw.name} has an ingredient without a quantity.`)
  }
  if (!Array.isArray(raw.instructions) || !raw.instructions.length) {
    throw invalid(`${raw.name} has no preparation instructions.`)
  }
  if (raw.cookTimeMinutes == null) {
    throw invalid(`${raw.name} has no estimated cooking time.`)
  }

  const ingredients = raw.ingredients.map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unit: item.unit ?? '',
    estimatedCost: item.estimatedCost == null ? null : Number(item.estimatedCost),
  }))

  return {
    id: raw.id ?? `${raw.mealType}-${index}-${raw.name}`,
    name: raw.name,
    mealType: raw.mealType,
    day: Number(raw.day) || 1,
    servings: Number(raw.servings) || 1,
    cookTimeMinutes: Number(raw.cookTimeMinutes),
    ingredients,
    instructions: raw.instructions,
    nutritionPerServing: raw.nutritionPerServing ?? null,
    nutritionSource: raw.nutritionSource ?? 'Estimated by the meal planner',
    estimatedCost:
      raw.estimatedCost == null
        ? ingredients.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0)
        : Number(raw.estimatedCost),
    allergens: raw.allergens ?? [],
    tags: raw.tags ?? [],
    alternatives: Array.isArray(raw.alternatives)
      ? raw.alternatives.map((alt, altIndex) => validateMeal(alt, altIndex))
      : [],
    status: raw.status ?? MEAL_STATUS.PENDING,
    saved: Boolean(raw.saved),
  }
}

function assertAllergySafe(meals, allergies) {
  if (!allergies.length) return

  for (const meal of meals) {
    const conflicts = findDeclaredConflicts(meal, allergies)
    if (conflicts.length) {
      throw invalid(
        `${meal.name} was returned even though it contains ${conflicts.join(', ')}. The plan was rejected for your safety.`,
      )
    }
  }
}

function validatePlan(payload, preferences) {
  const plan = payload?.plan ?? payload
  if (!plan || !Array.isArray(plan.meals) || !plan.meals.length) {
    throw invalid('The planner returned a plan with no meals.')
  }

  const meals = plan.meals.map((meal, index) => validateMeal(meal, index))
  assertAllergySafe(meals, preferences.allergies)
  assertAllergySafe(
    meals.flatMap((meal) => meal.alternatives),
    preferences.allergies,
  )

  return {
    id: plan.id ?? `plan-${Date.now()}`,
    createdAt: plan.createdAt ?? new Date().toISOString(),
    source: 'planner',
    servings: Number(plan.servings) || Number(preferences.householdSize) || 1,
    planningPeriod:
      Number(plan.planningPeriod) || Number(preferences.planningPeriod) || 1,
    meals,
    warnings: Array.isArray(plan.warnings) ? plan.warnings : [],
  }
}

export async function requestMealPlan(preferences) {
  const payload = await postJson('/api/meal-plan', { preferences })
  return validatePlan(payload, preferences)
}

export async function requestMealAlternative({
  meal,
  preferences,
  excludeNames = [],
}) {
  const payload = await postJson('/api/meal-plan/alternative', {
    meal,
    preferences,
    excludeNames,
  })

  const raw = payload?.meal ?? payload
  const alternative = validateMeal(raw, 0)
  assertAllergySafe([alternative], preferences.allergies)
  return alternative
}

export async function createCheckoutSession({ items, total }) {
  const payload = await postJson('/api/checkout/session', { items, total })

  if (!payload?.url) {
    throw invalid('Checkout could not be started: no Stripe session was returned.')
  }

  return payload.url
}
