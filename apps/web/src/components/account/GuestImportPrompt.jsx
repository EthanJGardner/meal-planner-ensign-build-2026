import { useState } from 'react'
import { DEFAULT_PREFERENCES } from '../../lib/constants'
import { guestToAccount, isDefaultGuestSetup } from '../../lib/accountSetup'
import {
  GUEST_IMPORT_OFFER_KEY,
  GUEST_PREFERENCES_KEY,
  readStored,
  writeStored,
} from '../../lib/storageKeys'
import { useAccountSetup } from '../../hooks/useAccountSetup'
import { useAuth } from '../../hooks/useAuth'
import { useHousehold } from '../../hooks/useHousehold'
import { Modal } from '../common/Modal'
import { ui } from '../ui/styles'

function readGuestSetup() {
  const stored = readStored(GUEST_PREFERENCES_KEY, null)
  if (!stored || typeof stored !== 'object') return null
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    nutritionGoals: { ...DEFAULT_PREFERENCES.nutritionGoals, ...stored.nutritionGoals },
  }
}

// Asked once, right after a guest registers: if their Setup in this browser
// differs from the defaults, offer to save it to the new account. Their own
// recipes stay in this browser either way.
export function GuestImportPrompt() {
  const { user } = useAuth()
  const account = useAccountSetup()
  const { updatePreferences } = useHousehold()

  const [offer] = useState(() => {
    const email = readStored(GUEST_IMPORT_OFFER_KEY, null)
    if (!user || !account || !email || email !== user.email?.toLowerCase()) return null
    const guest = readGuestSetup()
    if (!guest || isDefaultGuestSetup(guest)) {
      writeStored(GUEST_IMPORT_OFFER_KEY, null)
      return null
    }
    return guestToAccount(guest)
  })
  const [open, setOpen] = useState(Boolean(offer))
  const [saving, setSaving] = useState(false)

  if (!open || !offer) return null

  const close = () => {
    writeStored(GUEST_IMPORT_OFFER_KEY, null)
    setOpen(false)
  }

  const save = async () => {
    setSaving(true)
    updatePreferences(offer.setup)
    // The answer shows next to the Save button in Setup.
    await account.saveSetup(offer.setup)
    setSaving(false)
    close()
  }

  const labelFor = (id) =>
    account.allergenOptions.find((option) => option.id === id)?.label ?? id
  const allergies = [
    ...offer.setup.allergenIds.map(labelFor),
    ...offer.setup.customAllergies,
  ]

  return (
    <Modal title="Save your setup to your account?" onClose={close}>
      <p className="m-0 text-ink">
        You set up your household before you had an account. Save that setup to your account,
        so it is there whenever you sign in?
      </p>

      {allergies.length ? (
        <div className={`${ui.alert} mt-4`}>
          <p className="m-0 font-semibold">These allergies will be saved:</p>
          <ul className="m-0 mt-2 pl-5">
            {allergies.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="m-0 mt-2 font-semibold">
            Allergies on an account can&rsquo;t be removed later, so check the list first.
          </p>
        </div>
      ) : (
        <p className="m-0 mt-4 text-ink">No allergies will be saved.</p>
      )}

      {offer.skippedAllergies.length ? (
        <p className={`${ui.hint} mt-3`}>
          Not saved, because they aren&rsquo;t short plain terms:{' '}
          {offer.skippedAllergies.join(', ')}. Add them again in Setup with simpler names.
        </p>
      ) : null}
      {offer.skippedFoods.length ? (
        <p className={`${ui.hint} mt-3`}>
          These food notes could not be turned into liked or disliked foods and are left out:{' '}
          {offer.skippedFoods.join(', ')}.
        </p>
      ) : null}

      <p className={`${ui.hint} mt-3`}>
        Your own recipes stay in this browser either way.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className={ui.buttonPrimary} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save to my account'}
        </button>
        <button type="button" className={ui.button} disabled={saving} onClick={close}>
          Start fresh
        </button>
      </div>
    </Modal>
  )
}
