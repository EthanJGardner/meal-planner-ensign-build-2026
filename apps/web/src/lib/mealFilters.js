// Diet, taste and prep-time filters. The avoid list is handled separately in
// avoid.js because it is never relaxed to widen the recipe pool.

import { avoidConflicts } from './avoid.js'
import { singular } from './text.js'

// Each selected restriction must be named in the recipe's tags.
export function matchesDiet(recipe, dietaryRestrictions = []) {
  return dietaryRestrictions.every((restriction) =>
    (recipe.tags ?? []).includes(restriction),
  )
}

function matchesPrepTime(recipe, cookingTime) {
  const limit = Number(cookingTime) || 0
  return !limit || recipe.cookTimeMinutes <= limit
}

export function fillsSlot(recipe, slot) {
  return (recipe.slots ?? []).includes(slot)
}

// Splits the free-text taste field into foods to avoid and foods to favour.
// "no mushrooms, lots of chicken" -> { avoid: ['mushroom'], prefer: ['chicken'] }
function parseFoodPreferences(foodPreferences = '') {
  const avoid = []
  const prefer = []

  for (const raw of String(foodPreferences).split(/[,\n;]+/)) {
    const phrase = raw.trim().toLowerCase()
    if (!phrase) continue

    const negated = phrase.match(
      /^(?:no|not|avoid|without|hate|hates|dislike|dislikes|don'?t like|skip)\s+(.+)$/,
    )

    if (negated) {
      avoid.push(singular(negated[1]))
    } else {
      prefer.push(
        singular(
          phrase.replace(
            /^(?:lots of|lot of|more|extra|love|loves|i love|prefer|prefers)\s+/,
            '',
          ),
        ),
      )
    }
  }

  return { avoid: avoid.filter(Boolean), prefer: prefer.filter(Boolean) }
}

const recipeText = (recipe) =>
  `${recipe.name} ${(recipe.ingredients ?? [])
    .map((ingredient) => ingredient.name)
    .join(' ')}`.toLowerCase()

function avoidedFoods(recipe, foodPreferences) {
  const { avoid } = parseFoodPreferences(foodPreferences)
  const haystack = recipeText(recipe)
  return avoid.filter((term) => term.length > 1 && haystack.includes(term))
}

export function preferredFoodMatches(recipe, foodPreferences) {
  const { prefer } = parseFoodPreferences(foodPreferences)
  const haystack = recipeText(recipe)
  return prefer.filter((term) => term.length > 1 && haystack.includes(term))
}

// Every reason this recipe does not belong in the user's plan. An empty list
// means the recipe is safe and compliant.
export function recipeProblems(recipe, preferences) {
  const problems = []

  // Requirement 5.1: one strict list, so one problem covering all of it. The
  // conflict names the ingredient it found where it can, because that reads
  // better than naming the rule ("Contains Cheddar cheese", not "Contains
  // Milk") and because it is the ingredient a swap would have to replace.
  const conflicts = avoidConflicts(recipe, preferences.avoid ?? [])
  if (conflicts.length) {
    problems.push({
      kind: 'avoid',
      // A declared allergen is the case where the recipe itself says so, which
      // is worth saying more loudly than a scan result.
      declared: conflicts.some((conflict) => conflict.declared),
      message: `Contains ${conflicts
        .map((conflict) => conflict.ingredients[0] ?? conflict.entry)
        .join(', ')}`,
    })
  }

  if (!matchesDiet(recipe, preferences.dietaryRestrictions ?? [])) {
    const missing = (preferences.dietaryRestrictions ?? []).filter(
      (restriction) => !(recipe.tags ?? []).includes(restriction),
    )
    problems.push({
      kind: 'diet',
      message: `Not ${missing.join(' or ').toLowerCase()}`,
    })
  }

  const avoided = avoidedFoods(recipe, preferences.foodPreferences)
  if (avoided.length) {
    problems.push({
      kind: 'avoided',
      message: `Has ${avoided.join(', ')}, which you ruled out`,
    })
  }

  return problems
}

// Safe and compliant, ignoring the prep-time limit.
export function isRecipeCompliant(recipe, preferences) {
  return recipeProblems(recipe, preferences).length === 0
}

// Compliant and inside the prep-time limit, which is what the generator draws
// from.
export function isRecipeSelectable(recipe, preferences) {
  return (
    isRecipeCompliant(recipe, preferences) &&
    matchesPrepTime(recipe, preferences.cookingTime)
  )
}
