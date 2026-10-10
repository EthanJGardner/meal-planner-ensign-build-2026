export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

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
  { label: 'No limit', value: 0 },
]

export const PLANNING_PERIOD_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '5 days', value: 5 },
  { label: '7 days', value: 7 },
]

export const MEAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  SAVED: 'saved',
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
