// The only module that reads import.meta.env. Everything else imports from
// here, so a deployment changes one file's inputs and nothing else.

const env = import.meta.env

// Empty means same origin: in development the Vite proxy sends /api to the
// FastAPI server on :8000.
export const apiUrl = (env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const supabaseUrl = env.VITE_SUPABASE_URL || 'http://localhost:54321'

// Public by design, but there is no default: without it sign-in is switched
// off and the app runs for guests only.
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

export const authConfigured = Boolean(supabaseAnonKey)

// Every backend path the app calls. No path string appears anywhere else.
// Functions take the path parameters and encode them.
export const endpoints = {
  mealOptions: '/api/meal-options',
  // Not called yet: reads a saved set of options again by its session id.
  mealOptionsSession: (sessionId) =>
    `/api/meal-options/${encodeURIComponent(sessionId)}`,
  preferences: '/api/preferences',
  allergens: '/api/allergens',
  allergies: '/api/allergies',
  nutritionGoals: '/api/nutrition-goals',
  // The Stripe checkout session the grocery step asks for. No backend route
  // answers it yet; the call is kept exactly as it was.
  checkoutSession: '/api/checkout/session',
}
