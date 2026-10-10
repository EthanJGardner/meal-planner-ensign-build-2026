import { useMemo } from 'react'
import { MEAL_STATUS } from '../lib/constants'
import { isPastISO } from '../lib/dates'
import { findRecipe, slotServings } from '../lib/planner'
import { useHousehold } from './useHousehold'
import { useMealPlan } from './useMealPlan'

const round = (value) => Math.round(value * 100) / 100

// Requirement 5.5: ingredients aggregated across the days the user confirmed,
// scaled to the servings each meal is actually cooked for. Leftover slots buy
// nothing.
export function useGroceryList() {
  const { plan } = useMealPlan()
  const { preferences } = useHousehold()

  return useMemo(() => {
    const empty = { items: [], total: 0, mealCount: 0, dates: [] }
    const confirmed = (plan?.confirmedDates ?? []).filter(
      (date) => !isPastISO(date) && plan.days?.[date],
    )

    if (!plan || !confirmed.length) return empty

    const merged = new Map()
    let mealCount = 0

    for (const date of [...confirmed].sort()) {
      for (const slot of plan.days[date]) {
        if (!slot.recipe || slot.leftover) continue
        if (slot.status === MEAL_STATUS.REJECTED) continue

        const recipe = findRecipe(plan, slot.recipe)
        if (!recipe) continue

        mealCount += 1
        const servings = slotServings(slot, preferences)

        for (const ingredient of recipe.ingredients) {
          const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
          const existing = merged.get(key)

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
      total: round(items.reduce((sum, item) => sum + item.estimatedCost, 0)),
      mealCount,
      dates: [...confirmed].sort(),
    }
  }, [plan, preferences])
}
