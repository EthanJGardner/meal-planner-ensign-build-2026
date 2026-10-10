// Requirement 5.2 / 5.4: swapping one ingredient out of a recipe instead of
// throwing the whole recipe away, and saying so in plain language.
//
// Three rules keep this safe:
//
//  1. Replacements come from the curated table below, never from the AI and
//     never from the recipe text. An allergy substitution suggested by a model
//     is not evidence that the substitution is safe.
//  2. A recipe is only adapted when every blocking ingredient can be named. An
//     allergen a household reacts to that is declared on the recipe but not
//     visible in its ingredients (a sauce, a marinade) cannot be swapped out,
//     so the recipe stays excluded.
//  3. The adapted recipe is put back through the same allergy, diet and dislike
//     gate the original failed. If anything still trips, the adaptation is
//     thrown away and the recipe stays excluded. Nothing is planned on the
//     strength of the swap alone.
//
// Dietary tags are deliberately left untouched. Taking the milk out of a recipe
// does not give us the right to label it dairy-free, so an adapted recipe keeps
// exactly the diet claims it arrived with.

import { CUSTOM_RECIPE_SOURCE } from './constants.js'
import {
  avoidConflicts,
  detectedAllergens,
  ingredientAllergenMatches,
} from './avoid.js'
import { recipeProblems } from './mealFilters.js'

// Beyond this it is a different meal, not the same meal with a swap.
const MAX_SWAPS_PER_RECIPE = 3

// Keyed by a lowercase fragment of the ingredient name as recipes write it.
// Each entry is tried in order; `quantity` and `unit` are per-serving overrides
// for when the replacement is not measured the same way, and `cost` is the
// per-serving estimate for the replacement.
const SUBSTITUTIONS = {
  // --- milk --------------------------------------------------------------
  butter: [{ name: 'Olive oil', cost: 0.1 }],
  'cheddar cheese': [{ name: 'Dairy-free cheddar shreds', cost: 0.95 }],
  'shredded mexican cheese': [{ name: 'Dairy-free cheddar shreds', cost: 0.95 }],
  'parmesan cheese': [
    { name: 'Nutritional yeast', quantity: 1, unit: 'tbsp', cost: 0.3 },
  ],
  'greek yogurt': [{ name: 'Coconut yogurt', cost: 1.2 }],
  'sour cream': [{ name: 'Coconut yogurt', cost: 0.3 }],

  // --- eggs --------------------------------------------------------------
  eggs: [{ name: 'Firm tofu', quantity: 5, unit: 'oz', cost: 1.1 }],
  'egg noodles': [{ name: 'Rice noodles', cost: 0.7 }],
  mayonnaise: [{ name: 'Hummus', quantity: 2, unit: 'tbsp', cost: 0.5 }],

  // --- wheat and gluten --------------------------------------------------
  'whole wheat bread': [{ name: 'Gluten-free bread', cost: 0.8 }],
  'sourdough bread': [{ name: 'Gluten-free bread', cost: 0.8 }],
  'whole wheat tortilla': [{ name: 'Corn tortillas', quantity: 2, unit: 'whole', cost: 0.35 }],
  'penne pasta': [{ name: 'Gluten-free penne', cost: 0.95 }],
  'soy sauce': [{ name: 'Coconut aminos', cost: 0.35 }],

  // --- nuts and sesame ---------------------------------------------------
  'peanut butter': [{ name: 'Sunflower seed butter', cost: 0.45 }],
  'almond milk': [{ name: 'Oat milk', cost: 0.6 }],
  hummus: [{ name: 'White bean dip', cost: 0.5 }],

  // --- soy ---------------------------------------------------------------
  'firm tofu': [{ name: 'Chickpeas', quantity: 0.75, unit: 'cup', cost: 0.6 }],
  edamame: [{ name: 'Frozen peas', quantity: 0.5, unit: 'cup', cost: 0.35 }],

  // --- fish and shellfish ------------------------------------------------
  shrimp: [{ name: 'Chickpeas', quantity: 0.75, unit: 'cup', cost: 0.6 }],
  'canned tuna': [{ name: 'Chickpeas', quantity: 0.75, unit: 'cup', cost: 0.6 }],

  // --- commonly disliked -------------------------------------------------
  'red onion': [{ name: 'Scallion', quantity: 2, unit: 'whole', cost: 0.2 }],
  'yellow onion': [{ name: 'Scallion', quantity: 2, unit: 'whole', cost: 0.2 }],
  'cherry tomatoes': [{ name: 'Cucumber', quantity: 0.5, unit: 'whole', cost: 0.45 }],
  'bell pepper': [{ name: 'Zucchini', quantity: 0.5, unit: 'whole', cost: 0.4 }],
  avocado: [{ name: 'Hummus', quantity: 2, unit: 'tbsp', cost: 0.5 }],
  spinach: [{ name: 'Shredded cabbage', quantity: 1, unit: 'cup', cost: 0.3 }],
  zucchini: [{ name: 'Broccoli', quantity: 1, unit: 'cup', cost: 0.6 }],
  'coconut milk': [{ name: 'Oat milk', cost: 0.6 }],
  cilantro: [{ name: 'Parsley', cost: 0.2 }],
  olives: [{ name: 'Capers', cost: 0.3 }],
  mushrooms: [{ name: 'Zucchini', quantity: 0.5, unit: 'whole', cost: 0.4 }],
}

// Longest key first, so "egg noodles" is not matched as "eggs" and
// "whole wheat bread" is not matched as "butter"'s neighbours.
const KEYS_BY_LENGTH = Object.keys(SUBSTITUTIONS).sort(
  (a, b) => b.length - a.length,
)

function candidatesFor(ingredientName) {
  const name = ingredientName.toLowerCase()
  const key = KEYS_BY_LENGTH.find((candidate) => name.includes(candidate))
  return key ? SUBSTITUTIONS[key] : []
}

// A replacement is only usable if it is itself clear of everything on the
// household's avoid list. Checked as a one-ingredient recipe so it goes through
// exactly the same scan the whole recipe does.
function replacementIsClear(replacement, preferences) {
  const probe = {
    name: replacement.name,
    ingredients: [{ name: replacement.name, quantity: 1, unit: '', cost: 0 }],
    allergens: [],
    tags: [],
  }

  return avoidConflicts(probe, preferences.avoid ?? []).length === 0
}

// Every ingredient standing between this recipe and this household. Returns
// null when any conflict cannot be pinned to an ingredient, which is rule 2:
// a declared allergen the scan cannot see, or a dish named after the thing the
// household will not eat, is not something a swap can fix.
function blockingIngredients(recipe, preferences) {
  const names = new Set()

  for (const conflict of avoidConflicts(recipe, preferences.avoid ?? [])) {
    if (!conflict.ingredients.length) return null
    if (conflict.inName) return null
    for (const name of conflict.ingredients) names.add(name)
  }

  return [...names]
}

// Declared allergens, recomputed for the adapted recipe. An allergen is only
// dropped when the ingredient scan explained it before the swap and no longer
// reads it afterwards; anything declared but unexplained stays declared.
function adaptedAllergens(original, adapted) {
  const kept = (original.allergens ?? []).filter((allergen) => {
    const explained = ingredientAllergenMatches(original, allergen).length > 0
    const remains = ingredientAllergenMatches(adapted, allergen).length > 0
    return remains || !explained
  })

  return [...new Set([...kept, ...detectedAllergens(adapted)])]
}

// Keeps the directions readable: the step that said "butter" should say what is
// actually going in the pan.
const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const matchCase = (replacement, matched) =>
  matched[0] === matched[0].toUpperCase()
    ? replacement[0].toUpperCase() + replacement.slice(1)
    : replacement.toLowerCase()

const rewriteSteps = (instructions = [], swaps) =>
  instructions.map((step) =>
    swaps.reduce(
      (text, swap) =>
        text.replace(new RegExp(escapeForRegExp(swap.from), 'gi'), (matched) =>
          matchCase(swap.to, matched),
        ),
      step,
    ),
  )

// Returns an adapted copy of `recipe` that this household can eat, or null when
// no curated swap makes that true. Never applied to a recipe the user wrote
// themselves: their ingredients, prices and macros are theirs (requirement
// 5.8), so a conflicting own recipe is reported rather than rewritten.
export function adaptRecipe(recipe, preferences) {
  if (!recipe || recipe.source === CUSTOM_RECIPE_SOURCE) return null

  const problems = recipeProblems(recipe, preferences)
  if (!problems.length) return null

  // A diet mismatch or a free-text "no X" is about the whole recipe, not one
  // ingredient, so neither is something a swap can answer.
  if (problems.some((problem) => problem.kind === 'diet' || problem.kind === 'avoided')) {
    return null
  }

  const blocking = blockingIngredients(recipe, preferences)
  if (!blocking || !blocking.length || blocking.length > MAX_SWAPS_PER_RECIPE) {
    return null
  }

  const swaps = []
  const ingredients = []

  for (const ingredient of recipe.ingredients ?? []) {
    if (!blocking.includes(ingredient.name)) {
      ingredients.push(ingredient)
      continue
    }

    const replacement = candidatesFor(ingredient.name).find((candidate) =>
      replacementIsClear(candidate, preferences),
    )
    if (!replacement) return null

    ingredients.push({
      name: replacement.name,
      quantity: replacement.quantity ?? ingredient.quantity,
      unit: replacement.unit ?? ingredient.unit,
      cost: replacement.cost ?? ingredient.cost ?? 0,
    })
    swaps.push({ from: ingredient.name, to: replacement.name })
  }

  if (!swaps.length) return null

  const adapted = {
    ...recipe,
    ingredients,
    instructions: rewriteSteps(recipe.instructions, swaps),
    swaps,
    // Keeps the pristine recipe recoverable, so an adaptation never becomes
    // the stored version of the recipe (see restoreCatalog).
    baseIngredients: recipe.baseIngredients ?? recipe.ingredients,
    baseInstructions: recipe.baseInstructions ?? recipe.instructions,
    baseAllergens: recipe.baseAllergens ?? recipe.allergens,
  }

  adapted.allergens = adaptedAllergens(recipe, adapted)

  // Rule 3: the adapted recipe has to clear the gate on its own.
  if (recipeProblems(adapted, preferences).length) return null

  return adapted
}

export function adaptCatalog(recipes = [], preferences) {
  return recipes.map((recipe) => {
    const pristine = restoreRecipe(recipe)
    return adaptRecipe(pristine, preferences) ?? pristine
  })
}

// Strips an adaptation back to the recipe it was made from. Adaptations depend
// on the household's current setup, so only the pristine recipe is ever stored.
export function restoreRecipe(recipe) {
  if (!recipe?.swaps) return recipe

  const {
    swaps: _swaps,
    baseIngredients,
    baseInstructions,
    baseAllergens,
    ...rest
  } = recipe

  return {
    ...rest,
    ingredients: baseIngredients ?? recipe.ingredients,
    instructions: baseInstructions ?? recipe.instructions,
    allergens: baseAllergens ?? recipe.allergens,
  }
}

export const restoreCatalog = (recipes = []) => recipes.map(restoreRecipe)

export const hasSwaps = (recipe) => Boolean(recipe?.swaps?.length)

// The one sentence the user reads: "We swapped Milk for Oat milk."
export function describeSwaps(recipe) {
  if (!hasSwaps(recipe)) return ''
  return recipe.swaps
    .map((swap) => `We swapped ${swap.from} for ${swap.to}.`)
    .join(' ')
}
