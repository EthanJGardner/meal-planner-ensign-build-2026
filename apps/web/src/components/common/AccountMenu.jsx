import { Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'

// The header's sign-in state: "Sign in" for guests, the email and "Sign out"
// once signed in.
export function AccountMenu() {
  const { user, loading, signOut } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg border border-green-ink px-3 py-1 font-semibold text-green-ink no-underline hover:opacity-90"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3 text-green-ink">
      <span className="truncate text-sm" title={user.email}>
        {user.email}
      </span>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-green-ink bg-transparent px-3 py-1 font-semibold text-green-ink hover:opacity-90"
        onClick={signOut}
      >
        Sign out
      </button>
    </div>
  )
}
