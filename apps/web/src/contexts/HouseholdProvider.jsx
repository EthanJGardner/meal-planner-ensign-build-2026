import { useCallback, useMemo } from 'react'
import { DEFAULT_PREFERENCES } from '../lib/constants'
import { defaultPlanDates, sanitizePlanDates } from '../lib/dates'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { HouseholdContext } from './contexts'

const STORAGE_KEY = 'feedme.preferences'

// The default calendar selection depends on what today is, so it is built on
// first use rather than frozen into the constant.
const initialPreferences = () => ({
  ...DEFAULT_PREFERENCES,
  planDates: defaultPlanDates(),
})

// Allergies and disliked ingredients used to be two lists. They are one strict
// list now, so a payload stored by an older build is folded into it.
function readAvoid(stored) {
  if (Array.isArray(stored?.avoid)) return stored.avoid
  return [
    ...new Set([
      ...(stored?.allergies ?? []),
      ...(stored?.dislikedIngredients ?? []),
    ]),
  ]
}

export function HouseholdProvider({ children }) {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, initialPreferences)

  // Merge against the defaults so a stored payload from an older build still
  // has every field the form expects.
  //
  // `planDates` is sanitized on the way out as well as on the way in: dates
  // picked yesterday can be in the past by the time the user comes back, and a
  // plan cannot be built for a day that has already gone. A first visit gets
  // the default stretch of days; an empty selection the user made themselves is
  // left empty, because snapping it back would undo what they just did.
  const preferences = useMemo(() => {
    const dates = Array.isArray(stored?.planDates)
      ? sanitizePlanDates(stored.planDates)
      : defaultPlanDates()

    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
      avoid: readAvoid(stored),
      nutritionGoals: {
        ...DEFAULT_PREFERENCES.nutritionGoals,
        ...stored?.nutritionGoals,
      },
      planDates: dates,
      // Derived, never stored: the budget split and every "over N days" line
      // read the number of days the user actually picked.
      planningPeriod: dates.length,
    }
  }, [stored])

  const setPreference = useCallback(
    (key, value) => setStored((current) => ({ ...current, [key]: value })),
    [setStored],
  )

  const setNutritionGoal = useCallback(
    (key, value) =>
      setStored((current) => ({
        ...current,
        nutritionGoals: { ...current.nutritionGoals, [key]: value },
      })),
    [setStored],
  )

  const toggleListValue = useCallback(
    (key, value) =>
      setStored((current) => {
        const list = current[key] ?? []
        return {
          ...current,
          [key]: list.includes(value)
            ? list.filter((item) => item !== value)
            : [...list, value],
        }
      }),
    [setStored],
  )

  // Requirement 5.1: one list for everything the household cannot have, whether
  // the reason is an allergy or a dislike.
  const toggleAvoided = useCallback(
    (entry) =>
      setStored((current) => {
        const list = readAvoid(current)
        return {
          ...current,
          avoid: list.includes(entry)
            ? list.filter((item) => item !== entry)
            : [...list, entry],
          // Drop the legacy fields once the combined list has been written, so
          // the migration only ever runs once.
          allergies: undefined,
          dislikedIngredients: undefined,
        }
      }),
    [setStored],
  )

  const toggleRestriction = useCallback(
    (restriction) => toggleListValue('dietaryRestrictions', restriction),
    [toggleListValue],
  )

  const togglePlanDate = useCallback(
    (iso) =>
      setStored((current) => {
        const dates = sanitizePlanDates(current?.planDates ?? [])
        const next = dates.includes(iso)
          ? dates.filter((date) => date !== iso)
          : [...dates, iso]
        return { ...current, planDates: sanitizePlanDates(next) }
      }),
    [setStored],
  )

  const setPlanDates = useCallback(
    (dates) =>
      setStored((current) => ({
        ...current,
        planDates: sanitizePlanDates(dates),
      })),
    [setStored],
  )

  // Copying someone else's plan in lands on dates the user may not have picked,
  // so those dates join the selection rather than showing as days they did not
  // ask for.
  const addPlanDates = useCallback(
    (dates) =>
      setStored((current) => ({
        ...current,
        planDates: sanitizePlanDates([
          ...(current?.planDates ?? []),
          ...dates,
        ]),
      })),
    [setStored],
  )

  const resetPreferences = useCallback(
    () => setStored(initialPreferences()),
    [setStored],
  )

  const value = useMemo(
    () => ({
      preferences,
      setPreference,
      setNutritionGoal,
      toggleAvoided,
      toggleRestriction,
      togglePlanDate,
      setPlanDates,
      addPlanDates,
      resetPreferences,
    }),
    [
      preferences,
      setPreference,
      setNutritionGoal,
      toggleAvoided,
      toggleRestriction,
      togglePlanDate,
      setPlanDates,
      addPlanDates,
      resetPreferences,
    ],
  )

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}
