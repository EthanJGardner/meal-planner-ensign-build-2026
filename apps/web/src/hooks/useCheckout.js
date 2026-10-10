import { useCallback, useState } from 'react'
import { createCheckoutSession } from '../lib/api'

// Card data never touches our code: the backend creates a Stripe Checkout
// session and we hand the browser off to Stripe's hosted page.
export function useCheckout() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const startCheckout = useCallback(async ({ items, total }) => {
    if (!items.length) {
      setError('Accept at least one meal before checking out.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const url = await createCheckoutSession({
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          estimatedCost: item.estimatedCost,
        })),
        total,
      })
      window.location.href = url
    } catch (checkoutError) {
      setError(
        checkoutError.kind === 'unavailable'
          ? 'Checkout is unavailable because the payment service could not be reached. Start the API with Stripe keys configured and try again.'
          : checkoutError.message,
      )
      setStatus('error')
    }
  }, [])

  return { startCheckout, status, error }
}
