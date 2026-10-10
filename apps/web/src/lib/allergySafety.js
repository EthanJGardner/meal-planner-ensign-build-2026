// Client-side allergy gate. The backend is the primary validator, but a wrong
// answer here is a safety problem, so the frontend re-checks every meal before
// it is shown and never silently drops a conflict.

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
  Milk: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'parmesan', 'whey'],
  Eggs: ['egg', 'mayonnaise'],
  'Wheat/Gluten': ['wheat', 'bread', 'pasta', 'flour', 'tortilla', 'penne'],
  Soy: ['soy', 'tofu', 'edamame', 'miso'],
  Fish: ['salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'fish'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'mussel', 'clam'],
  Sesame: ['sesame', 'tahini', 'hummus'],
}

// "Oat milk" and friends are named after an allergen they do not contain.
const SAFE_EXCEPTIONS = {
  Milk: ['oat milk', 'almond milk', 'soy milk', 'coconut milk', 'rice milk'],
}

export function findDeclaredConflicts(meal, allergies) {
  const declared = meal.allergens ?? []
  return allergies.filter((allergy) => declared.includes(allergy))
}

export function findIngredientConflicts(meal, allergies) {
  const conflicts = []

  for (const allergy of allergies) {
    const keywords = ALLERGEN_KEYWORDS[allergy]
    if (!keywords) continue

    const exceptions = SAFE_EXCEPTIONS[allergy] ?? []
    const matches = (meal.ingredients ?? []).filter((ingredient) => {
      const name = ingredient.name.toLowerCase()
      if (exceptions.some((exception) => name.includes(exception))) return false
      return keywords.some((keyword) => name.includes(keyword))
    })

    if (matches.length) {
      conflicts.push({
        allergy,
        ingredients: matches.map((ingredient) => ingredient.name),
      })
    }
  }

  return conflicts
}

export function isMealAllergySafe(meal, allergies) {
  return (
    findDeclaredConflicts(meal, allergies).length === 0 &&
    findIngredientConflicts(meal, allergies).length === 0
  )
}
