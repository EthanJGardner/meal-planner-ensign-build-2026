// The avoid gate: the one check that decides whether a household can eat a
// recipe at all.
//
// Requirement 5.1/5.2: allergens and disliked ingredients are held in a single
// list and followed strictly. The reason an entry is on the list changes how it
// is matched and how loudly it is reported, not whether it is enforced:
//
//   - A standard allergen is matched with the keyword table below, and a recipe
//     that DECLARES it is blocked even when the scan cannot see it in the
//     ingredients. That is the case a substitution must never paper over.
//   - Anything else is matched against the ingredient names, and against the
//     dish name, allowing for plurals.
//
// The backend is the primary validator, but a wrong answer here is a safety
// problem, so the frontend re-checks every recipe before it is shown and never
// silently drops a conflict.

import { COMMON_ALLERGENS } from './constants.js'
import { singular } from './text.js'

const ALLERGEN_KEYWORDS = {
  Peanuts: ['peanut'],
  'Tree nuts': [
    'almond',
    'cashew',
    'walnut',
    'pecan',
    'pistachio',
    'hazelnut',
    'macadamia',
  ],
  Milk: [
    'milk',
    'cheese',
    'butter',
    'yogurt',
    'cream',
    'parmesan',
    'whey',
    'cheddar',
  ],
  Eggs: ['egg', 'mayonnaise'],
  'Wheat/Gluten': [
    'wheat',
    'bread',
    'pasta',
    'flour',
    'tortilla',
    'penne',
    'noodle',
    'sourdough',
  ],
  Soy: ['soy', 'tofu', 'edamame', 'miso'],
  Fish: ['salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'fish'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'mussel', 'clam', 'prawn'],
  Sesame: ['sesame', 'tahini', 'hummus'],
}

// Ingredients named after an allergen they do not actually contain.
const SAFE_EXCEPTIONS = {
  Milk: [
    'oat milk',
    'almond milk',
    'soy milk',
    'coconut milk',
    'rice milk',
    // "butter" matches Milk, but a nut or fruit butter contains none.
    'peanut butter',
    'almond butter',
    'cashew butter',
    'sunflower butter',
    'sunflower seed butter',
    'cocoa butter',
    'apple butter',
    // Substitutes named after the thing they replace (lib/substitutions.js).
    'coconut yogurt',
    'dairy-free cheddar',
    'dairy-free cheese',
  ],
  'Tree nuts': ['coconut milk', 'coconut yogurt'],
  'Wheat/Gluten': [
    'corn tortilla',
    'rice noodle',
    'gluten-free bread',
    'gluten-free penne',
    'gluten-free pasta',
  ],
}

export const isKnownAllergen = (entry) => COMMON_ALLERGENS.includes(entry)

// The ingredients in this recipe that read as containing `allergen`, using the
// keyword table and its exceptions.
export function ingredientAllergenMatches(recipe, allergen) {
  const keywords = ALLERGEN_KEYWORDS[allergen]
  if (!keywords) return []

  const exceptions = SAFE_EXCEPTIONS[allergen] ?? []

  return (recipe.ingredients ?? [])
    .filter((ingredient) => {
      const name = ingredient.name.toLowerCase()
      if (exceptions.some((exception) => name.includes(exception))) return false
      return keywords.some((keyword) => name.includes(keyword))
    })
    .map((ingredient) => ingredient.name)
}

// The ingredients that read as being, or containing, a plain named ingredient.
function ingredientTermMatches(recipe, term) {
  const needle = singular(term)
  if (needle.length < 2) return []

  return (recipe.ingredients ?? [])
    .filter((ingredient) => {
      const name = ingredient.name.toLowerCase()
      return name.includes(needle) || singular(name).includes(needle)
    })
    .map((ingredient) => ingredient.name)
}

// How one entry on the avoid list conflicts with this recipe, or null if it
// does not. `ingredients` is what a substitution would have to replace, so an
// empty `ingredients` on a conflict means there is nothing to swap.
export function entryConflict(recipe, entry) {
  const label = String(entry ?? '').trim()
  if (label.length < 2) return null

  const allergen = isKnownAllergen(label)
  const declared = (recipe.allergens ?? []).includes(label)

  const ingredients = allergen
    ? ingredientAllergenMatches(recipe, label)
    : ingredientTermMatches(recipe, label)

  // A dish named after what it is made of ("Avocado Toast") conflicts even
  // after the ingredient is swapped, because the name would then be a lie.
  const inName = !allergen && singular(recipe.name).includes(singular(label))

  if (!declared && !inName && !ingredients.length) return null

  return { entry: label, allergen, declared, inName, ingredients }
}

// Every reason this recipe is off limits for the household, as structured
// conflicts. An empty list means nothing on the avoid list was found.
export function avoidConflicts(recipe, avoid = []) {
  if (!avoid.length) return []

  const seen = new Set()
  const conflicts = []

  for (const entry of avoid) {
    const conflict = entryConflict(recipe, entry)
    if (!conflict || seen.has(conflict.entry)) continue
    seen.add(conflict.entry)
    conflicts.push(conflict)
  }

  return conflicts
}

// Just the labels, for the places that only need to name them.
export const avoidConflictLabels = (recipe, avoid = []) =>
  avoidConflicts(recipe, avoid).map((conflict) => conflict.entry)

// Requirement 5.8: a user writing out their own recipe will not always flag its
// allergens, so the ingredient scan is run over the recipe on its own and what
// it finds is added to the recipe's declared list. The scan is the same one the
// household gate uses, so a recipe can never declare its way past it.
export function detectedAllergens(recipe) {
  return COMMON_ALLERGENS.filter(
    (allergen) => ingredientAllergenMatches(recipe, allergen).length > 0,
  )
}
