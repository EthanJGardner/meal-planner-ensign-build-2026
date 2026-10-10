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

export const WEEKS_IN_PLAN = 5

// Week 0 is the completed week kept for reference; week 1 is the week the user
// is planning now. Earlier weeks are never regenerated.
export const CURRENT_WEEK = 1

// Requirement 5.3: the same meal must not reappear within this many days.
export const COOL_OFF_DAYS = 2

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

export const COOKING_TIME_OPTIONS = [
  { label: 'Under 15 min', value: 15 },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
  { label: 'Under 60 min', value: 60 },
  { label: 'Any time', value: 0 },
]

export const PLANNING_PERIOD_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '5 days', value: 5 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
]

export const MEAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
}

export const DEFAULT_PREFERENCES = {
  householdSize: 2,
  allergies: [],
  dietaryRestrictions: [],
  foodPreferences: '',
  nutritionGoals: {
    calories: 2000,
    protein: 100,
  },
  budget: 100,
  cookingTime: 30,
  planningPeriod: 5,
}

export const cookingTimeLabel = (value) =>
  COOKING_TIME_OPTIONS.find((option) => option.value === Number(value))?.label ??
  'Any time'
