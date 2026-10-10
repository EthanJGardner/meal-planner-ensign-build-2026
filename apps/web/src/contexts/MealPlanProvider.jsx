import { useCallback, useMemo, useState } from 'react'
import { MEAL_SLOTS, MEAL_STATUS } from '../lib/constants'
import { requestMealPlan, requestRecipeAlternative } from '../lib/api'
import {
  mergeCustomRecipes,
  withoutCustomRecipes,
} from '../lib/customRecipes'
import {
  planRangeLabel,
  sanitizePlanDates,
  shiftISO,
  shortDateISO,
  todayISO,
} from '../lib/dates'
import { demoAlternative, emptyDemoPlan, generateDemoPlan } from '../lib/demoPlan'
import {
  cloneDays,
  emptyDay,
  emptySlot,
  fitPlanToBudget,
  generateDays,
  isPlanEmpty,
  plannedDates,
  resyncPlan,
  visibleDates,
} from '../lib/planner'
import { adaptCatalog, restoreCatalog } from '../lib/substitutions'
import { scoreSharedPlan } from '../lib/sharedPlans'
import { useCustomRecipes } from '../hooks/useCustomRecipes'
import { useHousehold } from '../hooks/useHousehold'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MealPlanContext } from './contexts'

// v3: the plan is keyed by calendar date rather than by a position in a fixed
// five-week grid, so a v2 payload cannot be read and is not migrated.
const STORAGE_KEY = 'feedme.plan.v3'

const SAMPLE_DATA_NOTICE =
  'The live planner is unavailable, so this plan was built from sample recipes. Your list of things you cannot have and your diet filters still applied, but verify every ingredient before cooking.'

// Only these inputs can make an existing meal unsafe or non-compliant, so only
// these trigger an automatic re-check of the plan. Editing or deleting one of
// the user's own recipes counts: it can take a meal out of the catalog, or
// change what the meal contains.
const safetySignature = (preferences, customRecipes) =>
  JSON.stringify([
    preferences.avoid,
    preferences.dietaryRestrictions,
    preferences.foodPreferences,
    customRecipes.map((recipe) => [
      recipe.name,
      recipe.allergens,
      recipe.tags,
      recipe.slots,
      (recipe.ingredients ?? []).map((ingredient) => ingredient.name),
    ]),
  ])

const listOf = (items, limit = 3) => {
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')}, and ${items.length - limit} more`
}

function describeResync(changes) {
  const swapped = [
    ...new Map(
      changes
        .filter((change) => change.to)
        .map((change) => [`${change.from}>${change.to}`, change]),
    ).values(),
  ]
  const cleared = [
    ...new Set(changes.filter((change) => !change.to).map((change) => change.from)),
  ]

  const parts = []
  if (swapped.length) {
    parts.push(
      `swapped ${listOf(swapped.map((change) => `${change.from} for ${change.to}`))}`,
    )
  }
  if (cleared.length) {
    parts.push(
      `cleared ${listOf(cleared)} because no compliant replacement was available`,
    )
  }

  return `Your setup or your recipes changed, so we ${parts.join(' and ')}. Check the plan before you shop.`
}

function describePlan(preferences) {
  const avoid = preferences.avoid ?? []
  const people = Math.max(1, Number(preferences.householdSize) || 1)
  const days = preferences.planDates?.length ?? 0

  return `Plan built for ${people} ${people === 1 ? 'person' : 'people'} on the ${days} ${
    days === 1 ? 'day' : 'days'
  } you picked (${planRangeLabel(preferences.planDates ?? [])}). Every meal avoids ${
    avoid.length ? listOf(avoid, 5) : 'nothing in particular'
  }.`
}

export function MealPlanProvider({ children }) {
  const { preferences, addPlanDates } = useHousehold()
  const { customRecipes } = useCustomRecipes()
  // There is always a plan object so the recipe catalog is available to
  // Discover before the user has generated anything. An untouched plan is
  // simply one with no days in it.
  const [storedPlan, setStoredPlan] = useLocalStorage(STORAGE_KEY, emptyDemoPlan)

  // Requirement 5.8: the user's own recipes are layered over whatever catalog
  // the plan was built with, so a recipe submitted after the plan exists is
  // immediately offered for every slot without rebuilding anything. They are
  // stripped again on the way back to storage, so the recipe book stays the one
  // place they live and an edit or a delete is never shadowed by a stale copy.
  //
  // Requirement 5.4: the catalog is then adapted to this household, which is
  // where an ingredient swap happens. An adaptation belongs to the setup that
  // produced it, so it is derived on read and stripped on write: storage only
  // ever holds the recipe as it came.
  const plan = useMemo(
    () => ({
      ...storedPlan,
      days: storedPlan.days ?? {},
      recipes: adaptCatalog(
        mergeCustomRecipes(storedPlan.recipes, customRecipes),
        preferences,
      ),
    }),
    [storedPlan, customRecipes, preferences],
  )

  const setPlan = useCallback(
    (next) =>
      setStoredPlan((current) => {
        const withCustom = {
          ...current,
          days: current.days ?? {},
          recipes: mergeCustomRecipes(current.recipes, customRecipes),
        }
        const resolved = typeof next === 'function' ? next(withCustom) : next
        if (!resolved) return current
        return {
          ...resolved,
          recipes: withoutCustomRecipes(restoreCatalog(resolved.recipes)),
        }
      }),
    [customRecipes, setStoredPlan],
  )

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [note, setNote] = useState('')
  const [highlight, setHighlight] = useState([])
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const [busySlot, setBusySlot] = useState(null)
  const [publishedPlans, setPublishedPlans] = useState([])

  const dates = useMemo(() => visibleDates(plan, preferences), [plan, preferences])

  const clearTransient = useCallback(() => {
    setNote('')
    setHighlight([])
    setUndoSnapshot(null)
  }, [])

  const snapshot = useCallback(() => setUndoSnapshot(cloneDays(plan.days)), [plan])

  // Requirement 5.3: a safety-relevant preference change re-checks the plan and
  // swaps anything that is no longer allowed. This is React's documented
  // adjust-state-during-render pattern rather than an effect, so the corrected
  // plan is part of the same render the new preferences arrive in.
  const [lastSignature, setLastSignature] = useState(() =>
    safetySignature(preferences, customRecipes),
  )
  const signature = safetySignature(preferences, customRecipes)

  if (signature !== lastSignature) {
    setLastSignature(signature)

    const result = resyncPlan(plan, preferences)
    if (result.changes.length) {
      setPlan(result.plan)
      setNote(describeResync(result.changes))
      setHighlight([])
      setUndoSnapshot(null)
    }
  }

  const generatePlan = useCallback(async () => {
    // Nothing to plan for: say so here rather than letting the request fail.
    if (!sanitizePlanDates(preferences.planDates ?? []).length) {
      clearTransient()
      setNotice(null)
      setError(
        'Pick at least one day on the calendar before we build a plan for you.',
      )
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)
    setNotice(null)
    clearTransient()

    try {
      const generated = await requestMealPlan(preferences, customRecipes)
      setPlan(generated)
      setNote(describePlan(preferences))
      setStatus('ready')
      return
    } catch (requestError) {
      // An invalid or unsafe response is never papered over with sample data.
      if (requestError.kind === 'invalid') {
        setError(requestError.message)
        setStatus('error')
        return
      }

      try {
        setPlan(generateDemoPlan(preferences, customRecipes))
        setNotice(SAMPLE_DATA_NOTICE)
        setNote(describePlan(preferences))
        setStatus('ready')
      } catch (fallbackError) {
        setError(fallbackError.message)
        setStatus('error')
      }
    }
  }, [clearTransient, customRecipes, preferences, setPlan])

  // Rebuilds the days the user picked, in place, without going back to the
  // planner service.
  const regeneratePlan = useCallback(
    (only = null) => {
      const target = only
        ? sanitizePlanDates(only)
        : sanitizePlanDates(preferences.planDates ?? [])

      if (!target.length) {
        clearTransient()
        setNote('Pick the days you want on the calendar in Setup first.')
        return
      }

      const result = generateDays(plan, preferences, { dates: target })

      if (result.error) {
        clearTransient()
        setNote(result.error)
        return
      }

      snapshot()
      setPlan({ ...plan, days: result.days, warnings: result.warnings })
      setNote(
        `Rebuilt ${target.length} ${target.length === 1 ? 'day' : 'days'} (${planRangeLabel(target)}) from your setup.`,
      )
      setHighlight(target)
    },
    [clearTransient, plan, preferences, setPlan, snapshot],
  )

  const clearPlan = useCallback(() => {
    snapshot()
    setPlan({ ...plan, days: {}, confirmedDates: null })
    setHighlight([])
    setNote('Cleared every day in the plan.')
  }, [plan, setPlan, snapshot])

  const clearDay = useCallback(
    (date) => {
      snapshot()
      const days = cloneDays(plan.days)
      days[date] = emptyDay()
      setPlan({ ...plan, days })
      setHighlight([])
      setNote(`Cleared ${shortDateISO(date)}.`)
    },
    [plan, setPlan, snapshot],
  )

  const setSlot = useCallback(
    (date, slotIndex, { recipe, leftover }) => {
      setPlan((current) => {
        if (!current) return current

        const days = cloneDays(current.days)
        days[date] = days[date] ?? emptyDay()

        const target = days[date][slotIndex]
        const previous = target.recipe

        days[date][slotIndex] = {
          ...emptySlot(),
          recipe: recipe ?? null,
          leftover: Boolean(recipe) && Boolean(leftover),
          servings: target.servings,
        }

        // Changing a dinner should carry tomorrow's leftovers with it rather
        // than leaving a slot pointing at a meal nobody cooked.
        const tomorrow = days[shiftISO(date, 1)]
        if (slotIndex === 2 && tomorrow) {
          const next = tomorrow[1]
          const cooked = Boolean(recipe) && !leftover

          if (previous && next.leftover && next.recipe === previous) {
            next.recipe = cooked ? recipe : null
            next.leftover = cooked
          } else if (!next.recipe && cooked) {
            next.recipe = recipe
            next.leftover = true
          }
        }

        return { ...current, days }
      })

      clearTransient()
    },
    [clearTransient, setPlan],
  )

  // Requirement 5.8: a slot stores a recipe by name, so renaming one of the
  // user's own recipes has to carry every slot that was holding it. Without
  // this the plan would be left pointing at a name nothing answers to.
  const renameSlotRecipe = useCallback(
    (from, to) => {
      if (!from || !to || from === to) return

      setPlan((current) => {
        if (!current) return current

        const days = cloneDays(current.days)
        for (const slots of Object.values(days)) {
          for (const slot of slots) {
            if (slot.recipe === from) slot.recipe = to
          }
        }

        return { ...current, days }
      })
    },
    [setPlan],
  )

  const updateSlot = useCallback(
    (date, slotIndex, updater) =>
      setPlan((current) => {
        if (!current?.days?.[date]) return current
        const days = cloneDays(current.days)
        days[date][slotIndex] = updater(days[date][slotIndex])
        return { ...current, days }
      }),
    [setPlan],
  )

  const setSlotServings = useCallback(
    (date, slotIndex, value) =>
      updateSlot(date, slotIndex, (slot) => ({
        ...slot,
        servings: value === '' ? null : Number(value),
      })),
    [updateSlot],
  )

  const acceptSlot = useCallback(
    (date, slotIndex) =>
      updateSlot(date, slotIndex, (slot) => ({
        ...slot,
        status: MEAL_STATUS.ACCEPTED,
      })),
    [updateSlot],
  )

  const rejectSlot = useCallback(
    (date, slotIndex) =>
      updateSlot(date, slotIndex, (slot) => ({
        ...slot,
        status: MEAL_STATUS.REJECTED,
      })),
    [updateSlot],
  )

  const toggleSavedSlot = useCallback(
    (date, slotIndex) =>
      updateSlot(date, slotIndex, (slot) => ({ ...slot, saved: !slot.saved })),
    [updateSlot],
  )

  // Requirement 5.4: replace one meal without regenerating the plan.
  const requestAlternative = useCallback(
    async (date, slotIndex) => {
      const slot = plan.days?.[date]?.[slotIndex]
      if (!slot?.recipe) return

      const slotName = MEAL_SLOTS[slotIndex]
      const key = `${date}-${slotIndex}`
      setBusySlot(key)
      setError(null)

      const excludeNames = Object.values(plan.days)
        .flat()
        .filter((cell) => cell.recipe && !cell.leftover)
        .map((cell) => cell.recipe)

      const current = plan.recipes.find((recipe) => recipe.name === slot.recipe)

      const apply = (alternative) => {
        setPlan((state) => {
          if (!state?.days?.[date]) return state
          const recipes = state.recipes.some(
            (recipe) => recipe.name === alternative.name,
          )
            ? state.recipes
            : [...state.recipes, alternative]

          const days = cloneDays(state.days)
          days[date][slotIndex] = {
            ...days[date][slotIndex],
            recipe: alternative.name,
            leftover: false,
            status: MEAL_STATUS.PENDING,
            saved: false,
          }

          return { ...state, recipes, days }
        })
        setNote(`Swapped ${slot.recipe} for ${alternative.name}.`)
      }

      try {
        const alternative = await requestRecipeAlternative({
          recipe: current,
          slot: slotName,
          preferences,
          excludeNames,
        })
        apply(alternative)
      } catch (requestError) {
        if (requestError.kind === 'invalid') {
          setError(requestError.message)
        } else {
          const fallback = demoAlternative(
            plan,
            slot.recipe,
            slotName,
            preferences,
            excludeNames,
          )
          if (fallback) {
            apply(fallback)
          } else {
            setError(
              `No other ${slotName} option fits your setup. Take something off the list of things you cannot have to see more.`,
            )
          }
        }
      } finally {
        setBusySlot(null)
      }
    },
    [plan, preferences, setPlan],
  )

  const fitToBudget = useCallback(() => {
    const result = fitPlanToBudget(plan, preferences)
    snapshot()
    setPlan(result.plan)
    setNote(result.message)
    setHighlight(result.swaps.map((swap) => swap.date))
  }, [plan, preferences, setPlan, snapshot])

  // The grocery step works from the days the user has confirmed, so confirming
  // is what unlocks it.
  const confirmPlan = useCallback(() => {
    const confirmedDates = plannedDates(plan)
    if (!confirmedDates.length) return

    const days = cloneDays(plan.days)
    for (const date of confirmedDates) {
      days[date] = days[date].map((slot) =>
        slot.recipe && slot.status === MEAL_STATUS.PENDING
          ? { ...slot, status: MEAL_STATUS.ACCEPTED }
          : slot,
      )
    }

    setPlan({ ...plan, days, confirmedDates })
    setNote(
      `Confirmed ${confirmedDates.length} ${
        confirmedDates.length === 1 ? 'day' : 'days'
      } (${planRangeLabel(confirmedDates)}). Your grocery list is ready in the Grocery step.`,
    )
    setHighlight([])
  }, [plan, setPlan])

  // Requirement 5.6: a copied plan is still checked against this household's
  // own setup, and anything that does not fit is swapped. Shared plans are
  // stored as a run of days, so copying one is a question of which date it
  // starts on.
  const copyShared = useCallback(
    (shared, startDate, rows) => {
      const targetDates = rows.map((_, offset) => shiftISO(startDate, offset))
      const days = cloneDays(plan.days)

      rows.forEach((row, offset) => {
        const date = targetDates[offset]
        days[date] = MEAL_SLOTS.map((_, slotIndex) => ({
          ...emptySlot(),
          recipe: row[slotIndex]?.recipe ?? null,
          leftover: Boolean(row[slotIndex]?.leftover),
        }))
      })

      const staged = { ...plan, days }
      const result = resyncPlan(staged, preferences)
      const { score } = scoreSharedPlan(shared, plan.recipes, preferences)

      const swapped = result.changes.length
        ? ` We swapped ${result.changes.length} meal${
            result.changes.length > 1 ? 's' : ''
          } that did not fit your setup.`
        : ''

      snapshot()
      setPlan(result.plan === staged ? staged : result.plan)
      addPlanDates(targetDates)
      setNote(
        `Added "${shared.title}" from ${shared.author} (${score}% match) to ${planRangeLabel(
          targetDates,
        )}.${swapped}`,
      )
      setHighlight(targetDates)
    },
    [addPlanDates, plan, preferences, setPlan, snapshot],
  )

  const copySharedWeek = useCallback(
    (shared, startDate) => copyShared(shared, startDate, shared.days),
    [copyShared],
  )

  const copySharedDay = useCallback(
    (shared, date) => copyShared(shared, date, [shared.day]),
    [copyShared],
  )

  const publishPlan = useCallback(() => {
    const dayDates = plannedDates(plan)

    if (!dayDates.length) {
      setNote('Build a plan first, then you can share it.')
      return null
    }

    // The feed is day-of-the-week shaped, so a published plan is the first week
    // of days from the plan.
    const published = {
      id: `mine-${Date.now()}`,
      kind: 'weekly',
      title: `My plan from ${shortDateISO(dayDates[0])}`,
      author: 'You',
      household: Math.max(1, Number(preferences.householdSize) || 1),
      weeklyBudget:
        Number(preferences.budget) > 0
          ? Math.round(
              (Number(preferences.budget) / Math.max(dayDates.length, 1)) * 7,
            )
          : 0,
      tags: ['Shared by you'],
      likes: 0,
      days: dayDates
        .slice(0, 7)
        .map((date) =>
          plan.days[date].map((slot) => ({
            recipe: slot.recipe,
            leftover: slot.leftover,
          })),
        ),
    }

    setPublishedPlans((current) => [published, ...current])
    setNote(
      `Published "${published.title}". People with a lifestyle like yours can now copy it.`,
    )
    return published
  }, [plan, preferences])

  const undo = useCallback(() => {
    if (!undoSnapshot) return

    setPlan((current) => (current ? { ...current, days: undoSnapshot } : current))
    setNote('The plan is back the way it was.')
    setHighlight([])
    setUndoSnapshot(null)
  }, [setPlan, undoSnapshot])

  const dismissError = useCallback(() => setError(null), [])
  const dismissNote = useCallback(() => setNote(''), [])

  const value = useMemo(
    () => ({
      plan,
      dates,
      today: todayISO(),
      status,
      error,
      notice,
      note,
      highlight,
      busySlot,
      canUndo: Boolean(undoSnapshot),
      publishedPlans,
      empty: isPlanEmpty(plan),
      confirmedDates: plan.confirmedDates ?? null,
      generatePlan,
      regeneratePlan,
      clearPlan,
      clearDay,
      setSlot,
      setSlotServings,
      renameSlotRecipe,
      acceptSlot,
      rejectSlot,
      toggleSavedSlot,
      requestAlternative,
      fitToBudget,
      confirmPlan,
      copySharedWeek,
      copySharedDay,
      publishPlan,
      undo,
      dismissError,
      dismissNote,
    }),
    [
      plan,
      dates,
      status,
      error,
      notice,
      note,
      highlight,
      busySlot,
      undoSnapshot,
      publishedPlans,
      generatePlan,
      regeneratePlan,
      clearPlan,
      clearDay,
      setSlot,
      setSlotServings,
      renameSlotRecipe,
      acceptSlot,
      rejectSlot,
      toggleSavedSlot,
      requestAlternative,
      fitToBudget,
      confirmPlan,
      copySharedWeek,
      copySharedDay,
      publishPlan,
      undo,
      dismissError,
      dismissNote,
    ],
  )

  return (
    <MealPlanContext.Provider value={value}>{children}</MealPlanContext.Provider>
  )
}
