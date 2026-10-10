import { useMemo } from 'react'
import { MEAL_STATUS } from '../lib/constants'
import { findRecipe, slotServings } from '../lib/planner'
import { useHousehold } from './useHousehold'
import { useMealPlan } from './useMealPlan'

const round = (value) => Math.round(value * 100) / 100

// Requirement 5.5: ingredients aggregated across the confirmed week, scaled to
// the servings each meal is actually cooked for. Leftover slots buy nothing.
export function useGroceryList() {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  return useMemo(() => {
    const week = plan?.confirmedWeek
    const empty = { items: [], total: 0, mealCount: 0, week: null }

    if (!plan || week === null || week === undefined) return empty

    const merged = new Map()
    let mealCount = 0

    for (const day of plan.weeks[week]) {
      for (const slot of day) {
        if (!slot.recipe || slot.leftover) continue
        if (slot.status === MEAL_STATUS.REJECTED) continue

        const recipe = findRecipe(plan, slot.recipe)
        if (!recipe) continue

        mealCount += 1
        const servings = slotServings(slot, preferences)

        for (const ingredient of recipe.ingredients) {
          const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
          const existing = merged.get(key)

          // Planner recipes give names only. Their items carry no amount and
          // no price, and are never counted as free.
          if (ingredient.quantity == null) {
            if (existing) existing.usedIn.add(recipe.name)
            else {
              merged.set(key, {
                key,
                name: ingredient.name,
                unit: '',
                quantity: null,
                estimatedCost: null,
                usedIn: new Set([recipe.name]),
              })
            }
            continue
          }

          if (existing) {
            existing.quantity = round(
              existing.quantity + ingredient.quantity * servings,
            )
            existing.estimatedCost = round(
              existing.estimatedCost + (ingredient.cost ?? 0) * servings,
            )
            existing.usedIn.add(recipe.name)
          } else {
            merged.set(key, {
              key,
              name: ingredient.name,
              unit: ingredient.unit,
              quantity: round(ingredient.quantity * servings),
              estimatedCost: round((ingredient.cost ?? 0) * servings),
              usedIn: new Set([recipe.name]),
            })
          }
        }
      }
    }

    const items = [...merged.values()]
      .map((item) => ({ ...item, usedIn: [...item.usedIn] }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      items,
      total: round(items.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0)),
      // True when some items have no price, so `total` is not the list's cost.
      unpriced: items.some((item) => item.estimatedCost === null),
      mealCount,
      week,
    }
  }, [plan, preferences])
}
