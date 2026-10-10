import { useCallback, useMemo, useState } from 'react'
import {
  CURRENT_WEEK,
  MEAL_SLOTS,
  MEAL_STATUS,
  WEEK_DAYS,
  WEEKS_IN_PLAN,
} from '../lib/constants'
import { requestMealPlan, requestRecipeAlternative } from '../lib/api'
import { demoAlternative, emptyDemoPlan, generateDemoPlan } from '../lib/demoPlan'
import {
  emptySlot,
  fitWeekToBudget,
  generateWeeks,
  isWeekEmpty,
  resyncPlan,
  resyncWeek,
} from '../lib/planner'
import { scoreSharedPlan } from '../lib/sharedPlans'
import { useHousehold } from '../hooks/useHousehold'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MealPlanContext } from './contexts'

const STORAGE_KEY = 'feedme.plan.v2'
const DAYS_PER_WEEK = 7

const SAMPLE_DATA_NOTICE =
  'The live planner is unavailable, so this plan was built from sample recipes. Allergy and diet filters still applied, but verify every ingredient before cooking.'

const cloneWeeks = (weeks) =>
  weeks.map((week) => week.map((day) => day.map((slot) => ({ ...slot }))))

// Only these inputs can make an existing meal unsafe or non-compliant, so only
// these trigger an automatic re-check of the plan.
const safetySignature = (preferences) =>
  JSON.stringify([
    preferences.allergies,
    preferences.dietaryRestrictions,
    preferences.foodPreferences,
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

  return `Your setup changed, so we ${parts.join(' and ')}. Check the plan before you shop.`
}

function describePlan(preferences) {
  const avoided = preferences.allergies ?? []
  const people = Math.max(1, Number(preferences.householdSize) || 1)

  return `Plan built for ${people} ${people === 1 ? 'person' : 'people'} over ${
    preferences.planningPeriod
  } days. Every meal avoids ${
    avoided.length ? listOf(avoided, 5) : 'nothing in particular'
  }.`
}

export function MealPlanProvider({ children }) {
  const { preferences } = useHousehold()
  // There is always a plan object so the recipe catalog is available to
  // Discover before the user has generated anything. An untouched plan is
  // simply one with every week empty.
  const [plan, setPlan] = useLocalStorage(STORAGE_KEY, emptyDemoPlan)
  const [currentWeek, setCurrentWeek] = useState(CURRENT_WEEK)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [note, setNote] = useState('')
  const [highlight, setHighlight] = useState(null)
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const [busySlot, setBusySlot] = useState(null)
  const [publishedPlans, setPublishedPlans] = useState([])

  const clearTransient = useCallback(() => {
    setNote('')
    setHighlight(null)
    setUndoSnapshot(null)
  }, [])

  // Requirement 5.3: a safety-relevant preference change re-checks the plan and
  // swaps anything that is no longer allowed. This is React's documented
  // adjust-state-during-render pattern rather than an effect, so the corrected
  // plan is part of the same render the new preferences arrive in.
  const [lastSignature, setLastSignature] = useState(() =>
    safetySignature(preferences),
  )
  const signature = safetySignature(preferences)

  if (signature !== lastSignature) {
    setLastSignature(signature)

    const result = resyncPlan(plan, preferences)
    if (result.changes.length) {
      setPlan(result.plan)
      setNote(describeResync(result.changes))
      setHighlight(null)
      setUndoSnapshot(null)
    }
  }

  const generatePlan = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setNotice(null)
    clearTransient()

    try {
      const generated = await requestMealPlan(preferences)
      setPlan(generated)
      setCurrentWeek(CURRENT_WEEK)
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
        setPlan(generateDemoPlan(preferences))
        setCurrentWeek(CURRENT_WEEK)
        setNotice(SAMPLE_DATA_NOTICE)
        setNote(describePlan(preferences))
        setStatus('ready')
      } catch (fallbackError) {
        setError(fallbackError.message)
        setStatus('error')
      }
    }
  }, [clearTransient, preferences, setPlan])

  const regenerateWeek = useCallback(
    (week) => {
      if (!plan) return

      if (week < CURRENT_WEEK) {
        clearTransient()
        setNote('Week 1 is already done, so it stays exactly as it was.')
        return
      }

      const days =
        week === CURRENT_WEEK
          ? Math.min(
              DAYS_PER_WEEK,
              Number(preferences.planningPeriod) || DAYS_PER_WEEK,
            )
          : DAYS_PER_WEEK

      const result = generateWeeks(plan, preferences, { startWeek: week, days })

      if (result.error) {
        setNote(result.error)
        return
      }

      setUndoSnapshot({ week, days: cloneWeeks(plan.weeks)[week] })
      setPlan({ ...plan, weeks: result.weeks, warnings: result.warnings })
      setNote(`Week ${week + 1} was rebuilt from your setup.`)
      setHighlight(null)
    },
    [clearTransient, plan, preferences, setPlan],
  )

  const clearWeek = useCallback(
    (week) => {
      if (!plan) return

      const weeks = cloneWeeks(plan.weeks)
      setUndoSnapshot({ week, days: weeks[week] })
      weeks[week] = weeks[week].map(() => MEAL_SLOTS.map(() => emptySlot()))

      setPlan({
        ...plan,
        weeks,
        confirmedWeek: plan.confirmedWeek === week ? null : plan.confirmedWeek,
      })
      setHighlight(null)
      setNote(`Week ${week + 1} was cleared.`)
    },
    [plan, setPlan],
  )

  const setSlot = useCallback(
    (week, day, slotIndex, { recipe, leftover }) => {
      setPlan((current) => {
        if (!current) return current

        const weeks = cloneWeeks(current.weeks)
        const target = weeks[week][day][slotIndex]
        const previous = target.recipe

        weeks[week][day][slotIndex] = {
          ...emptySlot(),
          recipe: recipe ?? null,
          leftover: Boolean(recipe) && Boolean(leftover),
          servings: target.servings,
        }

        // Changing a dinner should carry tomorrow's leftovers with it rather
        // than leaving a slot pointing at a meal nobody cooked.
        if (slotIndex === 2 && day < DAYS_PER_WEEK - 1) {
          const next = weeks[week][day + 1][1]
          const cooked = Boolean(recipe) && !leftover

          if (previous && next.leftover && next.recipe === previous) {
            next.recipe = cooked ? recipe : null
            next.leftover = cooked
          } else if (!next.recipe && cooked) {
            next.recipe = recipe
            next.leftover = true
          }
        }

        return { ...current, weeks }
      })

      clearTransient()
    },
    [clearTransient, setPlan],
  )

  const setSlotServings = useCallback(
    (week, day, slotIndex, value) => {
      setPlan((current) => {
        if (!current) return current
        const weeks = cloneWeeks(current.weeks)
        weeks[week][day][slotIndex].servings = value === '' ? null : Number(value)
        return { ...current, weeks }
      })
    },
    [setPlan],
  )

  const updateSlot = useCallback(
    (week, day, slotIndex, updater) =>
      setPlan((current) => {
        if (!current) return current
        const weeks = cloneWeeks(current.weeks)
        weeks[week][day][slotIndex] = updater(weeks[week][day][slotIndex])
        return { ...current, weeks }
      }),
    [setPlan],
  )

  const acceptSlot = useCallback(
    (week, day, slotIndex) =>
      updateSlot(week, day, slotIndex, (slot) => ({
        ...slot,
        status: MEAL_STATUS.ACCEPTED,
      })),
    [updateSlot],
  )

  const rejectSlot = useCallback(
    (week, day, slotIndex) =>
      updateSlot(week, day, slotIndex, (slot) => ({
        ...slot,
        status: MEAL_STATUS.REJECTED,
      })),
    [updateSlot],
  )

  const toggleSavedSlot = useCallback(
    (week, day, slotIndex) =>
      updateSlot(week, day, slotIndex, (slot) => ({
        ...slot,
        saved: !slot.saved,
      })),
    [updateSlot],
  )

  // Requirement 5.4: replace one meal without regenerating the plan.
  const requestAlternative = useCallback(
    async (week, day, slotIndex) => {
      if (!plan) return

      const slot = plan.weeks[week][day][slotIndex]
      if (!slot.recipe) return

      const slotName = MEAL_SLOTS[slotIndex]
      const key = `${week}-${day}-${slotIndex}`
      setBusySlot(key)
      setError(null)

      const excludeNames = plan.weeks[week]
        .flatMap((cells) => cells)
        .filter((cell) => cell.recipe && !cell.leftover)
        .map((cell) => cell.recipe)

      const current = plan.recipes.find((recipe) => recipe.name === slot.recipe)

      const apply = (alternative) => {
        setPlan((state) => {
          if (!state) return state
          const recipes = state.recipes.some(
            (recipe) => recipe.name === alternative.name,
          )
            ? state.recipes
            : [...state.recipes, alternative]

          const weeks = cloneWeeks(state.weeks)
          weeks[week][day][slotIndex] = {
            ...weeks[week][day][slotIndex],
            recipe: alternative.name,
            leftover: false,
            status: MEAL_STATUS.PENDING,
            saved: false,
          }

          return { ...state, recipes, weeks }
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
              `No other ${slotName} option fits your allergies and diet. Relax a restriction to see more.`,
            )
          }
        }
      } finally {
        setBusySlot(null)
      }
    },
    [plan, preferences, setPlan],
  )

  const fitToBudget = useCallback(
    (week) => {
      if (!plan) return

      const result = fitWeekToBudget(plan, week, preferences)

      setUndoSnapshot({ week, days: cloneWeeks(plan.weeks)[week] })
      setPlan(result.plan)
      setNote(result.message)
      setHighlight(null)
    },
    [plan, preferences, setPlan],
  )

  // The grocery step works from the week the user has confirmed, so confirming
  // is what unlocks it.
  const confirmWeek = useCallback(
    (week) => {
      if (!plan) return

      const weeks = cloneWeeks(plan.weeks)
      weeks[week] = weeks[week].map((day) =>
        day.map((slot) =>
          slot.recipe && slot.status === MEAL_STATUS.PENDING
            ? { ...slot, status: MEAL_STATUS.ACCEPTED }
            : slot,
        ),
      )

      setPlan({ ...plan, weeks, confirmedWeek: week })
      setNote(
        `Week ${week + 1} is confirmed. Your grocery list is ready in the Grocery step.`,
      )
      setHighlight(null)
    },
    [plan, setPlan],
  )

  // Requirement 5.6: a copied plan is still checked against this household's
  // own allergies and diet, and anything unsafe is swapped.
  const copySharedWeek = useCallback(
    (shared, targetWeek) => {
      if (!plan) return

      const weeks = cloneWeeks(plan.weeks)
      const before = cloneWeeks(plan.weeks)[targetWeek]

      shared.days.forEach((day, dayIndex) => {
        day.forEach((cell, slotIndex) => {
          weeks[targetWeek][dayIndex][slotIndex] = {
            ...emptySlot(),
            recipe: cell?.recipe ?? null,
            leftover: Boolean(cell?.leftover),
          }
        })
      })

      const staged = { ...plan, weeks }
      const result = resyncWeek(staged, targetWeek, preferences)
      const { score } = scoreSharedPlan(shared, plan.recipes, preferences)

      const swapped = result.changes.length
        ? ` We swapped ${result.changes.length} meal${
            result.changes.length > 1 ? 's' : ''
          } that did not fit your setup.`
        : ''

      setUndoSnapshot({ week: targetWeek, days: before })
      setPlan({ ...staged, weeks: result.weeks })
      setNote(
        `Added "${shared.title}" from ${shared.author} (${score}% match) to Week ${
          targetWeek + 1
        }.${swapped}`,
      )
      setHighlight({ week: targetWeek, days: WEEK_DAYS.map((_, index) => index) })
      setCurrentWeek(targetWeek)
    },
    [plan, preferences, setPlan],
  )

  const copySharedDay = useCallback(
    (shared, dayIndex) => {
      if (!plan) return

      const targetWeek = CURRENT_WEEK
      const weeks = cloneWeeks(plan.weeks)
      const before = cloneWeeks(plan.weeks)[targetWeek]
      const previousDinner = weeks[targetWeek][dayIndex][2].recipe

      shared.day.forEach((cell, slotIndex) => {
        weeks[targetWeek][dayIndex][slotIndex] = {
          ...emptySlot(),
          recipe: cell?.recipe ?? null,
          leftover: Boolean(cell?.leftover),
        }
      })

      // Tomorrow's leftovers should follow the dinner that replaced it.
      if (dayIndex < DAYS_PER_WEEK - 1) {
        const next = weeks[targetWeek][dayIndex + 1][1]
        if (next.leftover && next.recipe === previousDinner) {
          next.recipe = shared.day[2]?.recipe ?? null
          next.leftover = Boolean(next.recipe)
        }
      }

      const staged = { ...plan, weeks }
      const result = resyncWeek(staged, targetWeek, preferences)
      const { score } = scoreSharedPlan(shared, plan.recipes, preferences)

      const swapped = result.changes.length
        ? ` We swapped ${result.changes.length} meal${
            result.changes.length > 1 ? 's' : ''
          } that did not fit your setup.`
        : ''

      setUndoSnapshot({ week: targetWeek, days: before })
      setPlan({ ...staged, weeks: result.weeks })
      setNote(
        `Added "${shared.title}" from ${shared.author} (${score}% match) to ${
          WEEK_DAYS[dayIndex]
        } of Week ${targetWeek + 1}.${swapped} The rest of your week is unchanged.`,
      )
      setHighlight({ week: targetWeek, days: [dayIndex] })
      setCurrentWeek(targetWeek)
    },
    [plan, preferences, setPlan],
  )

  const publishWeek = useCallback(
    (week) => {
      if (!plan || isWeekEmpty(plan, week)) {
        setNote('Fill this week in first, then you can share it.')
        return null
      }

      const published = {
        id: `mine-${Date.now()}`,
        kind: 'weekly',
        title: `My Week ${week + 1}`,
        author: 'You',
        household: Math.max(1, Number(preferences.householdSize) || 1),
        weeklyBudget:
          Number(preferences.budget) > 0
            ? Math.round(
                (Number(preferences.budget) /
                  (Number(preferences.planningPeriod) || 1)) *
                  DAYS_PER_WEEK,
              )
            : 0,
        tags: ['Shared by you'],
        likes: 0,
        days: plan.weeks[week].map((day) =>
          day.map((slot) => ({ recipe: slot.recipe, leftover: slot.leftover })),
        ),
      }

      setPublishedPlans((current) => [published, ...current])
      setNote(
        `Published "${published.title}". People with a lifestyle like yours can now copy it.`,
      )
      return published
    },
    [plan, preferences],
  )

  const undo = useCallback(() => {
    if (!undoSnapshot) return

    setPlan((current) => {
      if (!current) return current
      const weeks = cloneWeeks(current.weeks)
      weeks[undoSnapshot.week] = undoSnapshot.days
      return { ...current, weeks }
    })

    setCurrentWeek(undoSnapshot.week)
    setNote(`Week ${undoSnapshot.week + 1} is back the way it was.`)
    setHighlight(null)
    setUndoSnapshot(null)
  }, [setPlan, undoSnapshot])

  const dismissError = useCallback(() => setError(null), [])
  const dismissNote = useCallback(() => setNote(''), [])

  // Visiting an untouched future week fills it, so the tab is never a dead end.
  const goToWeek = useCallback(
    (week) => {
      setCurrentWeek(week)
      setNote('')
      setHighlight(null)

      if (!plan || week <= CURRENT_WEEK || week >= WEEKS_IN_PLAN) return
      if (!isWeekEmpty(plan, week)) return

      const result = generateWeeks(plan, preferences, {
        startWeek: week,
        days: DAYS_PER_WEEK,
      })
      if (result.error) return

      setPlan({ ...plan, weeks: result.weeks })
    },
    [plan, preferences, setPlan],
  )

  const value = useMemo(
    () => ({
      plan,
      currentWeek,
      status,
      error,
      notice,
      note,
      highlight,
      busySlot,
      canUndo: Boolean(undoSnapshot),
      undoWeek: undoSnapshot?.week ?? null,
      publishedPlans,
      generatePlan,
      regenerateWeek,
      clearWeek,
      setSlot,
      setSlotServings,
      acceptSlot,
      rejectSlot,
      toggleSavedSlot,
      requestAlternative,
      fitToBudget,
      confirmWeek,
      copySharedWeek,
      copySharedDay,
      publishWeek,
      undo,
      dismissError,
      dismissNote,
      goToWeek,
    }),
    [
      plan,
      currentWeek,
      status,
      error,
      notice,
      note,
      highlight,
      busySlot,
      undoSnapshot,
      publishedPlans,
      generatePlan,
      regenerateWeek,
      clearWeek,
      setSlot,
      setSlotServings,
      acceptSlot,
      rejectSlot,
      toggleSavedSlot,
      requestAlternative,
      fitToBudget,
      confirmWeek,
      copySharedWeek,
      copySharedDay,
      publishWeek,
      undo,
      dismissError,
      dismissNote,
      goToWeek,
    ],
  )

  return (
    <MealPlanContext.Provider value={value}>{children}</MealPlanContext.Provider>
  )
}
