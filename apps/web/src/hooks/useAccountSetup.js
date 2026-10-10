import { useContext } from 'react'
import { AccountSetupContext } from '../contexts/contexts'

// Null for guests, so callers can branch on it: `if (account) …`.
export function useAccountSetup() {
  return useContext(AccountSetupContext)
}
