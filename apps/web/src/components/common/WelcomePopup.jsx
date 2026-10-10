import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { WELCOME_DISMISSED_KEY, readStored, writeStored } from '../../lib/storageKeys'
import { ui } from '../ui/styles'
import { Modal } from './Modal'

// Shown once, on a guest's first visit. Closing it any way counts as seen.
export function WelcomePopup() {
  const { user, loading } = useAuth()
  const [dismissed, setDismissed] = useState(() =>
    Boolean(readStored(WELCOME_DISMISSED_KEY, false)),
  )

  if (loading || user || dismissed) return null

  const dismiss = () => {
    writeStored(WELCOME_DISMISSED_KEY, true)
    setDismissed(true)
  }

  return (
    <Modal title="Welcome to FeedMe" onClose={dismiss}>
      <p className="m-0 mb-6 text-ink">
        Tell FeedMe your household&rsquo;s allergies, diet, budget and cooking
        time, and it plans breakfast, lunch and dinner for the week, then turns
        the plan into a grocery list.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className={ui.buttonPrimary} onClick={dismiss}>
          Start planning
        </button>
        <Link to="/login" className={ui.link} onClick={dismiss}>
          Sign in
        </Link>
      </div>
    </Modal>
  )
}
