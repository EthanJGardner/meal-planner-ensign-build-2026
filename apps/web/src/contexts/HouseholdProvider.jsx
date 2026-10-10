import { useCallback, useMemo } from 'react'
import { DEFAULT_PREFERENCES } from '../lib/constants'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { HouseholdContext } from './contexts'

const STORAGE_KEY = 'feedme.preferences'

export function HouseholdProvider({ children }) {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, DEFAULT_PREFERENCES)

  // Merge against the defaults so a stored payload from an older build still
  // has every field the form expects.
  const preferences = useMemo(
    () => ({
      ...DEFAULT_PREFERENCES,
      ...stored,
      nutritionGoals: {
        ...DEFAULT_PREFERENCES.nutritionGoals,
        ...stored?.nutritionGoals,
      },
    }),
    [stored],
  )

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

  const toggleAllergy = useCallback(
    (allergy) => toggleListValue('allergies', allergy),
    [toggleListValue],
  )

  const toggleRestriction = useCallback(
    (restriction) => toggleListValue('dietaryRestrictions', restriction),
    [toggleListValue],
  )

  const resetPreferences = useCallback(
    () => setStored(DEFAULT_PREFERENCES),
    [setStored],
  )

  const value = useMemo(
    () => ({
      preferences,
      setPreference,
      setNutritionGoal,
      toggleAllergy,
      toggleRestriction,
      resetPreferences,
    }),
    [
      preferences,
      setPreference,
      setNutritionGoal,
      toggleAllergy,
      toggleRestriction,
      resetPreferences,
    ],
  )

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}
