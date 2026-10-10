import { endpoints } from './config.js'
import { apiFetch, invalid } from './http.js'

// Calls to the FastAPI backend. Paths live in config.js, the fetch helper and
// the 'unavailable' / 'invalid' error kinds in http.js. Every route needs the
// signed-in user's bearer token except GET /api/allergens.
//
// POST /api/meal-options         { plan_days, meal_types } -> MealOptions
// GET  /api/preferences          -> null | Preferences
// PUT  /api/preferences          Preferences -> Preferences
// GET  /api/allergens            -> [{ id, label }]
// GET  /api/allergies            -> [{ allergen, label, kind }]
// POST /api/allergies            { allergen_id } or { name } -> the full list
// GET  /api/nutrition-goals      -> null | { calories, protein_g, carbs_g, fat_g }
// PUT  /api/nutrition-goals      the same object -> the same object
// POST /api/checkout/session     { items, total } -> { url }
//
// The answer of POST /api/meal-options is turned into a plan in mealOptions.js.

// The planner takes 25 to 35 seconds, so it gets far more than the default.
const PLANNER_TIMEOUT_MS = 90_000

export const requestMealOptions = ({ planDays, mealTypes }) =>
  apiFetch(endpoints.mealOptions, {
    method: 'POST',
    body: { plan_days: planDays, meal_types: mealTypes },
    timeoutMs: PLANNER_TIMEOUT_MS,
  })

export const fetchAllergens = () => apiFetch(endpoints.allergens)
export const fetchAllergies = () => apiFetch(endpoints.allergies)

// Allergies are add-only: there is no route to remove one.
export const addAllergy = (allergy) =>
  apiFetch(endpoints.allergies, { method: 'POST', body: allergy })

export const fetchPreferences = () => apiFetch(endpoints.preferences)
export const savePreferences = (preferences) =>
  apiFetch(endpoints.preferences, { method: 'PUT', body: preferences })

export const fetchNutritionGoals = () => apiFetch(endpoints.nutritionGoals)
export const saveNutritionGoals = (goals) =>
  apiFetch(endpoints.nutritionGoals, { method: 'PUT', body: goals })

export async function createCheckoutSession({ items, total }) {
  const payload = await apiFetch(endpoints.checkoutSession, {
    method: 'POST',
    body: { items, total },
    timeoutMs: 60_000,
  })

  if (!payload?.url) {
    throw invalid(
      'Checkout could not be started: no Stripe session was returned.',
    )
  }

  return payload.url
}
