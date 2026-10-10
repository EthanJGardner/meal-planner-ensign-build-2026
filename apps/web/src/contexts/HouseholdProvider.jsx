import { useCallback, useMemo } from 'react'
import { withDerivedFields } from '../lib/accountSetup'
import { DEFAULT_PREFERENCES } from '../lib/constants'
import { GUEST_PREFERENCES_KEY } from '../lib/storageKeys'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { HouseholdContext } from './contexts'

// A guest uses the defaults and key below. A signed-in user's Setup is kept
// under its own key with the account's defaults (accountSetup.js); the parent
// remounts this provider when the user changes, because the key is read once.
export function HouseholdProvider({
  children,
  storageKey = GUEST_PREFERENCES_KEY,
  defaults = DEFAULT_PREFERENCES,
}) {
  const [stored, setStored] = useLocalStorage(storageKey, defaults)

  // Merge against the defaults so a stored payload from an older build still
  // has every field the form expects. An account's derived fields (its
  // allergy labels and food text) are rebuilt here; a guest's are untouched.
  const preferences = useMemo(
    () =>
      withDerivedFields({
        ...defaults,
        ...stored,
        nutritionGoals: {
          ...defaults.nutritionGoals,
          ...stored?.nutritionGoals,
        },
      }),
    [defaults, stored],
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
    () => setStored(defaults),
    [defaults, setStored],
  )

  // Replaces several fields at once. Used by a signed-in user's Setup, which
  // loads whole groups of fields from the server.
  const updatePreferences = useCallback(
    (patch) =>
      setStored((current) => ({
        ...current,
        ...(typeof patch === 'function' ? patch(current) : patch),
      })),
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
      updatePreferences,
    }),
    [
      preferences,
      setPreference,
      setNutritionGoal,
      toggleAllergy,
      toggleRestriction,
      resetPreferences,
      updatePreferences,
    ],
  )

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}
