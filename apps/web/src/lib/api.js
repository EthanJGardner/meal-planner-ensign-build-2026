import { CURRENT_WEEK, MEAL_SLOTS, WEEKS_IN_PLAN } from './constants.js'
import { allergenConflicts } from './allergySafety.js'
import { mergeCustomRecipes } from './customRecipes.js'
import { SAMPLE_RECIPES } from './sampleRecipes.js'
import { emptySlot, emptyWeeks } from './planner.js'

// Contract expected from the FastAPI backend:
//
// POST /api/meal-plan              { preferences, customRecipes } -> { plan }
// POST /api/meal-plan/alternative  { recipe, slot, preferences, excludeNames }
//                                    -> { recipe }
// POST /api/checkout/session       { items, total } -> { url }
//
// plan: { id, planningPeriod, warnings?: string[], meals: Meal[] }
// Meal: { name, mealType: 'breakfast'|'lunch'|'dinner', day: 1-based,
//         cookTimeMinutes, allergens?: string[], tags?: string[],
//         nutritionPerServing: { calories, protein, carbs, fat },
//         nutritionSource?: string,
//         ingredients: [{ name, quantity, unit, cost }],
//         instructions: string[] }
//
// Quantities, costs and nutrition are all PER SERVING. The frontend scales
// them to the household size, so the backend never has to know it.
//
// `customRecipes` are recipes the user wrote themselves, in the same per-serving
// Meal shape minus `day` and `mealType` (they carry `slots` instead, naming the
// meals they can fill). The planner may place them in the plan like any other
// recipe; a meal it returns under a custom recipe's name is treated as that
// recipe. The planner must not invent macros for them: the user's numbers are
// the ones shown, and `nutritionSource` says so.

const REQUEST_TIMEOUT_MS = 60_000

const failure = (message, kind) => {
  const error = new Error(message)
  error.kind = kind
  return error
}

// 'unavailable' means the planner could not be reached and the sample-data
// path is allowed. 'invalid' means it answered with something we refuse to
// show (requirement 7.2).
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

function validateRecipe(raw, index) {
  const where = `Meal ${index + 1}`

  if (!raw || typeof raw !== 'object') {
    throw invalid(`${where} was missing from the planner response.`)
  }
  if (!raw.name) throw invalid(`${where} has no name.`)
  if (!MEAL_SLOTS.includes(raw.mealType)) {
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
  if (raw.nutritionPerServing?.calories == null) {
    throw invalid(`${raw.name} has no calorie estimate.`)
  }

  return {
    recipe: {
      name: raw.name,
      // Lunch and dinner are interchangeable in our pools, so a main the
      // planner put at lunch can also be offered for dinner.
      slots:
        raw.mealType === 'breakfast' ? ['breakfast'] : ['lunch', 'dinner'],
      cookTimeMinutes: Number(raw.cookTimeMinutes),
      allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      nutritionPerServing: {
        calories: Number(raw.nutritionPerServing.calories) || 0,
        protein: Number(raw.nutritionPerServing.protein) || 0,
        carbs: Number(raw.nutritionPerServing.carbs) || 0,
        fat: Number(raw.nutritionPerServing.fat) || 0,
      },
      nutritionSource: raw.nutritionSource ?? 'Estimated by the meal planner',
      ingredients: raw.ingredients.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit ?? '',
        cost: Number(item.cost) || 0,
      })),
      instructions: raw.instructions,
      source: 'planner',
    },
    placement: {
      day: Math.max(1, Number(raw.day) || 1),
      slotIndex: MEAL_SLOTS.indexOf(raw.mealType),
    },
  }
}

// Nothing the planner returns is shown until it has been re-checked here. A
// declared allergen the household reacts to rejects the whole response.
function assertAllergySafe(recipes, allergies) {
  if (!allergies.length) return

  for (const recipe of recipes) {
    const conflicts = allergenConflicts(recipe, allergies)
    if (conflicts.length) {
      throw invalid(
        `${recipe.name} was returned even though it contains ${conflicts.join(', ')}. The plan was rejected for your safety.`,
      )
    }
  }
}

// The planner's recipes sit alongside the sample catalog so the Plan view's
// dropdowns still offer a full set of swaps. A planner recipe wins on a name
// clash because it is the one the plan was actually built from, except against
// the user's own recipes, which are layered on last so their numbers are never
// overwritten by the planner's guess at them.
function mergeCatalog(planned, customRecipes) {
  const byName = new Map(SAMPLE_RECIPES.map((recipe) => [recipe.name, { ...recipe, source: 'sample' }]))
  for (const recipe of planned) byName.set(recipe.name, recipe)
  return mergeCustomRecipes([...byName.values()], customRecipes)
}

function buildPlan(payload, preferences, customRecipes) {
  const raw = payload?.plan ?? payload
  if (!raw || !Array.isArray(raw.meals) || !raw.meals.length) {
    throw invalid('The planner returned a plan with no meals.')
  }

  const validated = raw.meals.map((meal, index) => validateRecipe(meal, index))
  const recipes = validated.map((item) => item.recipe)
  assertAllergySafe(recipes, preferences.allergies ?? [])

  const weeks = emptyWeeks()
  const maxDays = (WEEKS_IN_PLAN - CURRENT_WEEK) * 7

  for (const { recipe, placement } of validated) {
    const offset = placement.day - 1
    if (offset < 0 || offset >= maxDays) continue

    const absolute = CURRENT_WEEK * 7 + offset
    const week = Math.floor(absolute / 7)
    const day = absolute % 7

    weeks[week][day][placement.slotIndex] = {
      ...emptySlot(),
      recipe: recipe.name,
    }
  }

  return {
    id: raw.id ?? `plan-${Date.now()}`,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    source: 'planner',
    recipes: mergeCatalog(recipes, customRecipes),
    weeks,
    confirmedWeek: null,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  }
}

export async function requestMealPlan(preferences, customRecipes = []) {
  const payload = await postJson('/api/meal-plan', { preferences, customRecipes })
  return buildPlan(payload, preferences, customRecipes)
}

export async function requestRecipeAlternative({
  recipe,
  slot,
  preferences,
  excludeNames = [],
}) {
  const payload = await postJson('/api/meal-plan/alternative', {
    recipe,
    slot,
    preferences,
    excludeNames,
  })

  const raw = payload?.recipe ?? payload?.meal ?? payload
  const { recipe: alternative } = validateRecipe(
    { ...raw, mealType: raw?.mealType ?? slot },
    0,
  )
  assertAllergySafe([alternative], preferences.allergies ?? [])
  return alternative
}

export async function createCheckoutSession({ items, total }) {
  const payload = await postJson('/api/checkout/session', { items, total })

  if (!payload?.url) {
    throw invalid(
      'Checkout could not be started: no Stripe session was returned.',
    )
  }

  return payload.url
}
