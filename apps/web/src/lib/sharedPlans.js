// Requirement 5.6: seeded plans so Discover has something to show on day one,
// plus the match score that ranks them against the viewer's own setup.
//
// These are sample personas with made-up prices, not real users. The cold-start
// problem is real, and seeding is the team's answer to it for the demo.

import { prepTimeLabel } from './constants.js'
import { avoidConflictLabels } from './avoid.js'
import { isRecipeCompliant, matchesDiet } from './mealFilters.js'
import { recipeCostPerServing } from './planner.js'

const leftoverOf = (recipe) => ({ recipe, leftover: true })
const cooked = (recipe) => ({ recipe, leftover: false })

// Lunch is yesterday's dinner reheated, which is how these personas actually
// cook. The first day needs a lunch of its own.
function weekly({ breakfasts, dinners, firstLunch, ...rest }) {
  return {
    ...rest,
    kind: 'weekly',
    days: dinners.map((dinner, index) => [
      cooked(breakfasts[index % breakfasts.length]),
      index === 0 ? cooked(firstLunch) : leftoverOf(dinners[index - 1]),
      cooked(dinner),
    ]),
  }
}

function daily({ meals, ...rest }) {
  return { ...rest, kind: 'daily', day: meals.map(cooked) }
}

export const SHARED_WEEKLY_PLANS = [
  weekly({
    id: 'w-budget-student',
    title: 'Budget student week',
    author: 'Maya, student',
    household: 1,
    weeklyBudget: 45,
    tags: ['Budget'],
    likes: 128,
    breakfasts: ['Oat & Banana Breakfast Bowl', 'Veggie Scramble with Toast'],
    firstLunch: 'Chickpea Lunch Salad',
    dinners: [
      'Black Bean Rice Bowl',
      'Lentil & Sweet Potato Soup',
      'Egg Fried Rice',
      'Black Bean Rice Bowl',
      'Pasta Primavera',
      'Lentil & Sweet Potato Soup',
      'Egg Fried Rice',
    ],
  }),
  weekly({
    id: 'w-protein-budget',
    title: 'Protein on a budget',
    author: 'Jordan, student',
    household: 1,
    weeklyBudget: 60,
    tags: ['High-protein'],
    likes: 96,
    breakfasts: ['Veggie Omelette', 'Greek Yogurt Berry Parfait'],
    firstLunch: 'Turkey & Hummus Wrap',
    dinners: [
      'Sheet-Pan Chicken & Vegetables',
      'Chicken Grain Bowl',
      'Tofu Veggie Stir-Fry',
      "Morgan's Fire Tacos",
      'Sheet-Pan Chicken & Vegetables',
      'Lentil & Sweet Potato Soup',
      'Chicken Grain Bowl',
    ],
  }),
  weekly({
    id: 'w-plant-powered',
    title: 'Plant-powered week',
    author: 'Priya and Dev',
    household: 2,
    weeklyBudget: 70,
    tags: ['Vegan'],
    likes: 74,
    breakfasts: ['Chia Berry Pudding', 'Avocado Toast'],
    firstLunch: 'Chickpea Lunch Salad',
    dinners: [
      'Black Bean Rice Bowl',
      'Tofu Veggie Stir-Fry',
      'Lentil & Sweet Potato Soup',
      'Coconut Veggie Curry',
      'Tofu Veggie Stir-Fry',
      'Lentil & Sweet Potato Soup',
      'Black Bean Rice Bowl',
    ],
  }),
  weekly({
    id: 'w-family-no-nuts',
    title: 'Family week, no nuts or shellfish',
    author: 'Sam, family of 3',
    household: 3,
    weeklyBudget: 110,
    tags: ['Family'],
    likes: 61,
    breakfasts: ['Veggie Omelette', 'Oat & Banana Breakfast Bowl'],
    firstLunch: 'Chicken Grain Bowl',
    dinners: [
      "Morgan's Fire Tacos",
      'Sheet-Pan Chicken & Vegetables',
      'Pasta Primavera',
      'Chicken Grain Bowl',
      'Sheet-Pan Chicken & Vegetables',
      'Black Bean Rice Bowl',
      "Morgan's Fire Tacos",
    ],
  }),
  weekly({
    id: 'w-fast-weeknights',
    title: 'Fast weeknights for four',
    author: 'The Garcias',
    household: 4,
    weeklyBudget: 150,
    tags: ['Family', 'Quick'],
    likes: 53,
    breakfasts: [
      'Avocado Toast',
      'Oat & Banana Breakfast Bowl',
      'Veggie Omelette',
    ],
    firstLunch: 'Egg Fried Rice',
    dinners: [
      'Chicken Grain Bowl',
      "Morgan's Fire Tacos",
      'Shrimp Tacos',
      'Egg Fried Rice',
      'Baked Salmon with Quinoa',
      'Tofu Veggie Stir-Fry',
      'Chicken Grain Bowl',
    ],
  }),
  weekly({
    id: 'w-pescatarian-batch',
    title: 'Pescatarian batch cook',
    author: 'Alex and Jo',
    household: 2,
    weeklyBudget: 80,
    tags: ['Pescatarian'],
    likes: 88,
    breakfasts: ['Greek Yogurt Berry Parfait', 'Chia Berry Pudding'],
    firstLunch: 'Tuna Rice Bowl',
    dinners: [
      'Baked Salmon with Quinoa',
      'Shrimp Tacos',
      'Lentil & Sweet Potato Soup',
      'Baked Salmon with Quinoa',
      'Black Bean Rice Bowl',
      'Shrimp Tacos',
      'Tofu Veggie Stir-Fry',
    ],
  }),
]

export const SHARED_DAILY_PLANS = [
  daily({
    id: 'd-cheap-student',
    title: 'Cheap student day',
    author: 'Chris, student',
    household: 1,
    dailyBudget: 6,
    tags: ['Budget'],
    likes: 41,
    meals: ['Chia Berry Pudding', 'Black Bean Rice Bowl', 'Egg Fried Rice'],
  }),
  daily({
    id: 'd-night-shift',
    title: 'Night-shift protein day',
    author: 'Nina, works nights',
    household: 1,
    dailyBudget: 10,
    tags: ['High-protein'],
    likes: 35,
    meals: [
      'Veggie Omelette',
      'Chicken Grain Bowl',
      'Baked Salmon with Quinoa',
    ],
  }),
  daily({
    id: 'd-easy-vegan',
    title: 'Easy vegan day',
    author: 'Taylor and Sam',
    household: 2,
    dailyBudget: 14,
    tags: ['Vegan'],
    likes: 29,
    meals: [
      'Avocado Toast',
      'Tofu Veggie Stir-Fry',
      'Lentil & Sweet Potato Soup',
    ],
  }),
  daily({
    id: 'd-family-no-nuts',
    title: 'Family day without nuts or shellfish',
    author: 'Rae, parent of two',
    household: 3,
    dailyBudget: 20,
    tags: ['Family'],
    likes: 52,
    meals: [
      'Oat & Banana Breakfast Bowl',
      "Morgan's Fire Tacos",
      'Sheet-Pan Chicken & Vegetables',
    ],
  }),
  daily({
    id: 'd-busy-four',
    title: 'Busy family of four',
    author: 'The Okafors',
    household: 4,
    dailyBudget: 24,
    tags: ['Family', 'Quick'],
    likes: 44,
    meals: [
      'Peanut Butter & Honey Toast',
      'Sheet-Pan Chicken & Vegetables',
      'Chicken Grain Bowl',
    ],
  }),
  daily({
    id: 'd-prep-ahead',
    title: 'Prep-ahead protein day',
    author: 'Dev',
    household: 1,
    dailyBudget: 8,
    tags: ['High-protein'],
    likes: 33,
    meals: [
      'Greek Yogurt Berry Parfait',
      'Sheet-Pan Chicken & Vegetables',
      'Baked Salmon with Quinoa',
    ],
  }),
]

export const sharedPlanSlots = (shared) =>
  shared.kind === 'daily' ? [shared.day] : shared.days

// Every distinct recipe a shared plan cooks, resolved against our catalog.
function sharedPlanRecipes(shared, recipes) {
  const names = new Set()

  for (const day of sharedPlanSlots(shared)) {
    for (const slot of day) {
      if (slot?.recipe) names.add(slot.recipe)
    }
  }

  return [...names]
    .map((name) => recipes.find((recipe) => recipe.name === name))
    .filter(Boolean)
}

// What the plan's groceries would cost this viewer, ignoring leftover slots
// because nothing new is bought for them.
export function sharedPlanCost(shared, recipes, householdSize) {
  let perServing = 0

  for (const day of sharedPlanSlots(shared)) {
    for (const slot of day) {
      if (!slot?.recipe || slot.leftover) continue
      const recipe = recipes.find((item) => item.name === slot.recipe)
      if (recipe) perServing += recipeCostPerServing(recipe)
    }
  }

  return Math.round(perServing * Math.max(1, householdSize) * 100) / 100
}

// Requirement 5.6: rank browsed plans against the viewer's household size,
// budget, avoid list, diet and prep time, out of 100.
export function scoreSharedPlan(shared, recipes, preferences) {
  const householdSize = Math.max(1, Number(preferences.householdSize) || 1)
  const budget = Number(preferences.budget) || 0
  const period = Number(preferences.planningPeriod) || 1
  const diets = preferences.dietaryRestrictions ?? []
  const avoid = preferences.avoid ?? []
  const cookingTime = Number(preferences.cookingTime) || 0

  let score = 0
  const reasons = []

  const householdGap = Math.abs(shared.household - householdSize)
  if (householdGap === 0) {
    score += 25
    reasons.push('Same household size')
  } else if (householdGap === 1) {
    score += 15
    reasons.push('Similar household size')
  } else {
    score += 5
  }

  const viewerWeekly = budget ? (budget / period) * 7 : 0
  const planWeekly =
    shared.kind === 'daily' ? shared.dailyBudget * 7 : shared.weeklyBudget

  if (viewerWeekly > 0) {
    const ratio = Math.abs(planWeekly - viewerWeekly) / viewerWeekly
    if (ratio <= 0.1) {
      score += 25
      reasons.push('Same budget')
    } else if (ratio <= 0.25) {
      score += 15
      reasons.push('Similar budget')
    } else if (ratio <= 0.5) {
      score += 5
    }
  } else {
    score += 10
  }

  const used = sharedPlanRecipes(shared, recipes)
  const unsafe = used.filter((recipe) => !isRecipeCompliant(recipe, preferences))

  if (!unsafe.length) {
    score += 20
    if (avoid.length) reasons.push('Nothing you cannot have')
  }

  if (!diets.length) {
    score += 15
  } else if (used.every((recipe) => matchesDiet(recipe, diets))) {
    score += 15
    reasons.push('Fits your diet')
  }

  const slowest = used.reduce(
    (worst, recipe) => Math.max(worst, recipe.cookTimeMinutes),
    0,
  )
  if (!cookingTime || slowest <= cookingTime) {
    score += 15
    if (cookingTime) {
      reasons.push(`Prep ${prepTimeLabel(cookingTime).toLowerCase()}`)
    }
  }

  // A plan containing something the household cannot have must never present
  // as a good match, however well the budget and household size line up. The
  // cap keeps every unsafe plan below every safe one.
  const avoidUnsafe = used.filter(
    (recipe) => avoidConflictLabels(recipe, avoid).length > 0,
  )
  if (avoidUnsafe.length) score = Math.min(score, 49)

  return {
    score,
    reasons,
    unsafeCount: unsafe.length,
    avoidUnsafeCount: avoidUnsafe.length,
  }
}

export const describeSharedPlan = (shared) =>
  `${shared.author} · ${shared.household} ${
    shared.household === 1 ? 'person' : 'people'
  } · $${shared.kind === 'daily' ? shared.dailyBudget : shared.weeklyBudget}${
    shared.kind === 'daily' ? '/day' : '/week'
  }`
