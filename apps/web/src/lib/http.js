import { apiUrl } from './config.js'
import { supabase } from './supabase.js'

const DEFAULT_TIMEOUT_MS = 20_000

export const SESSION_ENDED_MESSAGE =
  'Your session has ended. Sign in again to keep using your account.'

const failure = (message, kind, status = 0) => {
  const error = new Error(message)
  error.kind = kind
  error.status = status
  return error
}

// 'unavailable' means the service could not be reached, or the route is not
// there (yet), so a fallback such as local storage or the sample planner is
// allowed. 'invalid' means it answered and refused, or answered with something
// we refuse to show (requirement 7.2). `status` is the HTTP status, 0 if none.
export const unavailable = (message, status = 0) =>
  failure(message, 'unavailable', status)
export const invalid = (message, status = 0) => failure(message, 'invalid', status)

// Set by the AuthProvider, which can sign out and navigate. Kept here so this
// module does not depend on React or the router.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function accessToken() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// FastAPI puts a readable message in `detail`. Validation errors carry a list
// there instead, which is not fit to show.
const detailOf = (payload) =>
  typeof payload?.detail === 'string' ? payload.detail : null

// The one fetch helper for the backend. `path` comes from `endpoints` in
// config.js. A signed-in user's access token is sent as a bearer token.
export async function apiFetch(
  path,
  { method = 'GET', body, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const token = await accessToken()
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw unavailable('The FeedMe server could not be reached.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (response.ok) return payload

  const detail = detailOf(payload)

  if (response.status === 401) {
    if (token) onUnauthorized?.(SESSION_ENDED_MESSAGE)
    throw invalid(SESSION_ENDED_MESSAGE, 401)
  }

  // A route from the contract answering 404 is not deployed yet.
  if (response.status === 404 || response.status >= 500) {
    throw unavailable(
      detail ?? `The FeedMe server could not answer (${response.status}).`,
      response.status,
    )
  }

  throw invalid(detail ?? `The request was refused (${response.status}).`, response.status)
}
