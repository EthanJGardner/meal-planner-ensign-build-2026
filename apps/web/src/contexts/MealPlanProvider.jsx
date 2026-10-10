import { useCallback, useMemo, useState } from 'react'
import { MEAL_STATUS } from '../lib/constants'
import { requestMealAlternative, requestMealPlan } from '../lib/api'
import { generateDemoAlternative, generateDemoPlan } from '../lib/demoPlan'
import { useHousehold } from '../hooks/useHousehold'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { MealPlanContext } from './contexts'

const STORAGE_KEY = 'feedme.plan'

const SAMPLE_DATA_NOTICE =
  'The live planner is unavailable, so this plan was built from sample recipes. Allergy filters still applied, but verify every ingredient before cooking.'

export function MealPlanProvider({ children }) {
  const { preferences } = useHousehold()
  const [plan, setPlan] = useLocalStorage(STORAGE_KEY, null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyMealId, setBusyMealId] = useState(null)

  const updateMeal = useCallback(
    (mealId, updater) =>
      setPlan((current) => {
        if (!current) return current
        return {
          ...current,
          meals: current.meals.map((meal) =>
            meal.id === mealId ? updater(meal) : meal,
          ),
        }
      }),
    [setPlan],
  )

  const generatePlan = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setNotice(null)

    try {
      const generated = await requestMealPlan(preferences)
      setPlan(generated)
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
        setNotice(SAMPLE_DATA_NOTICE)
        setStatus('ready')
      } catch (fallbackError) {
        setError(fallbackError.message)
        setStatus('error')
      }
    }
  }, [preferences, setPlan])

  const acceptMeal = useCallback(
    (mealId) =>
      updateMeal(mealId, (meal) => ({ ...meal, status: MEAL_STATUS.ACCEPTED })),
    [updateMeal],
  )

  const rejectMeal = useCallback(
    (mealId) =>
      updateMeal(mealId, (meal) => ({ ...meal, status: MEAL_STATUS.REJECTED })),
    [updateMeal],
  )

  const toggleSaved = useCallback(
    (mealId) => updateMeal(mealId, (meal) => ({ ...meal, saved: !meal.saved })),
    [updateMeal],
  )

  // Swaps in an alternative the user picked, keeping the replaced meal in the
  // alternatives list so the choice is reversible.
  const replaceMeal = useCallback(
    (mealId, alternative) =>
      updateMeal(mealId, (meal) => ({
        ...alternative,
        id: meal.id,
        day: meal.day,
        mealType: meal.mealType,
        status: MEAL_STATUS.PENDING,
        saved: false,
        alternatives: [
          { ...meal, alternatives: [], status: MEAL_STATUS.PENDING },
          ...(meal.alternatives ?? []).filter(
            (option) => option.name !== alternative.name,
          ),
        ],
      })),
    [updateMeal],
  )

  const requestAlternative = useCallback(
    async (mealId) => {
      const meal = plan?.meals.find((item) => item.id === mealId)
      if (!meal) return

      setBusyMealId(mealId)
      setError(null)

      const excludeNames = (plan?.meals ?? [])
        .filter((item) => item.mealType === meal.mealType)
        .map((item) => item.name)

      try {
        const alternative = await requestMealAlternative({
          meal,
          preferences,
          excludeNames,
        })
        replaceMeal(mealId, alternative)
      } catch (requestError) {
        if (requestError.kind === 'invalid') {
          setError(requestError.message)
        } else {
          try {
            replaceMeal(
              mealId,
              generateDemoAlternative(meal, preferences, excludeNames),
            )
            setNotice(SAMPLE_DATA_NOTICE)
          } catch (fallbackError) {
            setError(fallbackError.message)
          }
        }
      } finally {
        setBusyMealId(null)
      }
    },
    [plan, preferences, replaceMeal],
  )

  const clearPlan = useCallback(() => {
    setPlan(null)
    setStatus('idle')
    setError(null)
    setNotice(null)
  }, [setPlan])

  const dismissError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      plan,
      status,
      error,
      notice,
      busyMealId,
      generatePlan,
      acceptMeal,
      rejectMeal,
      toggleSaved,
      replaceMeal,
      requestAlternative,
      clearPlan,
      dismissError,
    }),
    [
      plan,
      status,
      error,
      notice,
      busyMealId,
      generatePlan,
      acceptMeal,
      rejectMeal,
      toggleSaved,
      replaceMeal,
      requestAlternative,
      clearPlan,
      dismissError,
    ],
  )

  return (
    <MealPlanContext.Provider value={value}>{children}</MealPlanContext.Provider>
  )
}
