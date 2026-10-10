import { useMemo } from 'react'
import { MEAL_STATUS } from '../lib/constants'
import { useMealPlan } from './useMealPlan'

const round = (n) => Math.round(n * 100) / 100

export function useGroceryList() {
  const { plan } = useMealPlan()

  return useMemo(() => {
    const accepted = (plan?.meals ?? []).filter(
      (meal) => meal.status === MEAL_STATUS.ACCEPTED,
    )

    const merged = new Map()

    for (const meal of accepted) {
      for (const ingredient of meal.ingredients) {
        const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
        const existing = merged.get(key)

        if (existing) {
          existing.quantity = round(existing.quantity + ingredient.quantity)
          existing.estimatedCost = round(
            existing.estimatedCost + (ingredient.estimatedCost ?? 0),
          )
          existing.usedIn.push(meal.name)
        } else {
          merged.set(key, {
            key,
            name: ingredient.name,
            unit: ingredient.unit,
            quantity: round(ingredient.quantity),
            estimatedCost: round(ingredient.estimatedCost ?? 0),
            usedIn: [meal.name],
          })
        }
      }
    }

    const items = [...merged.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    return {
      items,
      total: round(items.reduce((sum, item) => sum + item.estimatedCost, 0)),
      mealCount: accepted.length,
      servings: plan?.servings ?? 1,
    }
  }, [plan])
}
