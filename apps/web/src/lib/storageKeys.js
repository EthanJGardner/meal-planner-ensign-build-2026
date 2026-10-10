// Local storage keys shared by more than one module. A guest's data keeps the
// keys it always had; a signed-in user's Setup and plan get their own, so
// signing in or out never mixes the two.

export const GUEST_PREFERENCES_KEY = 'feedme.preferences'
export const GUEST_PLAN_KEY = 'feedme.plan.v2'

export const accountPreferencesKey = (userId) => `feedme.account.${userId}.preferences`
export const accountPlanKey = (userId) => `feedme.account.${userId}.plan`

// Set once the guest has closed the welcome popup.
export const WELCOME_DISMISSED_KEY = 'feedme.welcomeDismissed'

// The email a guest just registered with, until they have been asked whether
// to save their guest Setup to it. Kept in storage so it survives a reload or
// an email confirmation step.
export const GUEST_IMPORT_OFFER_KEY = 'feedme.guestImportOffer'

export function readStored(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeStored(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private browsing, quota). Nothing to do.
  }
}
