import { useCheckout } from '../../hooks/useCheckout'
import { Banner } from '../common/Banner'

export function CheckoutPanel({ items, total }) {
  const { startCheckout, status, error } = useCheckout()

  return (
    <div className="checkout">
      <div className="checkout__row">
        <div>
          <p className="checkout__total">${total.toFixed(2)}</p>
          <p className="checkout__detail">
            {items.length} {items.length === 1 ? 'item' : 'items'} · estimated
            total, charged by Stripe at checkout
          </p>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => startCheckout({ items, total })}
          disabled={status === 'loading' || !items.length}
        >
          {status === 'loading' ? 'Opening Stripe…' : 'Check out with Stripe'}
        </button>
      </div>

      {error ? (
        <Banner variant="error" title="Checkout failed">
          {error}
        </Banner>
      ) : null}

      <p className="checkout__fineprint">
        Payment is handled on Stripe's hosted checkout page. Card details never
        reach this app or our backend.
      </p>
    </div>
  )
}
