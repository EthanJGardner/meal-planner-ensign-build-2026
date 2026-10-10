export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner']

export const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

// Requirement 5.3: the same meal must not reappear within this many days.
export const COOL_OFF_DAYS = 2

// The allergens on the standard list. These are matched against a recipe with
// the keyword table in avoid.js, and a recipe that declares one is
// blocked whether or not the scan can see it in the ingredients.
export const COMMON_ALLERGENS = [
  'Peanuts',
  'Tree nuts',
  'Milk',
  'Eggs',
  'Wheat/Gluten',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
]

export const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Halal',
  'Kosher',
  'Low-carb',
  'Dairy-free',
  'Gluten-free',
]

// Prep time is the user-facing name for the per-meal time limit. The recipe
// field behind it is still `cookTimeMinutes`, which is the name the planner
// API contract uses.
export const PREP_TIME_OPTIONS = [
  { label: 'Under 15 min', value: 15 },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
  { label: 'Under 60 min', value: 60 },
  { label: 'Any amount of time', value: 0 },
]

// Requirement 5.1: everything the household will not eat lives in one list,
// whether the reason is an allergy or a dislike, and every entry is followed
// strictly. These are the non-allergen ingredients offered alongside the
// standard allergens; anything on either list may be worked around by swapping
// that one ingredient out (lib/substitutions.js) rather than dropping the
// recipe, under the safety rules documented there.
export const OTHER_AVOIDED_INGREDIENTS = [
  'Mushrooms',
  'Onions',
  'Tomatoes',
  'Bell peppers',
  'Olives',
  'Cilantro',
  'Avocado',
  'Coconut',
  'Tofu',
  'Mayonnaise',
  'Spinach',
  'Zucchini',
]

// Marks a recipe the user typed in themselves, as opposed to one from the
// sample catalog ('sample') or the planner service ('planner').
export const CUSTOM_RECIPE_SOURCE = 'custom'

// Requirement 5.8: a user-submitted recipe carries its own macro values, so we
// record where those numbers came from.
export const DEFAULT_CUSTOM_NUTRITION_SOURCE = 'Entered by you, not verified'

export const MEAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
}

// `planDates` is the list of calendar days the user picked, as YYYY-MM-DD.
// `planningPeriod` is not stored: it is derived from how many days are picked,
// so the budget split and the plan copy only ever have one source of truth.
export const DEFAULT_PREFERENCES = {
  householdSize: 2,
  // One strict list: allergens and disliked ingredients together.
  avoid: [],
  dietaryRestrictions: [],
  foodPreferences: '',
  nutritionGoals: {
    calories: 2000,
    protein: 100,
  },
  budget: 100,
  cookingTime: 30,
  planDates: [],
}

export const prepTimeLabel = (value) =>
  PREP_TIME_OPTIONS.find((option) => option.value === Number(value))?.label ??
  'Any amount of time'
