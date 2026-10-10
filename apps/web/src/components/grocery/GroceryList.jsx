import { planRangeLabel } from '../../lib/dates'
import { useGroceryList } from '../../hooks/useGroceryList'
import { useHousehold } from '../../hooks/useHousehold'
import { usePlanSummary } from '../../hooks/usePlanSummary'
import { CheckoutPanel } from './CheckoutPanel'

export function GroceryList() {
  const { items, total, mealCount, dates } = useGroceryList()
  const { preferences } = useHousehold()
  const { swaps } = usePlanSummary()

  // Requirement 5.4: the list holds the replacement, not the ingredient the
  // recipe was written with, so the shopper is told before they buy.
  const swappedIn = new Set(swaps.map((swap) => swap.to))

  return (
    <>
      <p className="panel__lede">
        Built from the {mealCount} {mealCount === 1 ? 'meal' : 'meals'} you
        confirmed across {dates.length} {dates.length === 1 ? 'day' : 'days'} (
        {planRangeLabel(dates)}), sized for your household of{' '}
        {preferences.householdSize}. Leftover slots buy nothing extra.
      </p>

      {swaps.length ? (
        <p className="alert alert--soft">
          {swaps.map((swap) => `We swapped ${swap.from} for ${swap.to}.`).join(' ')}{' '}
          The replacements are what is on this list.
        </p>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Total amount</th>
              <th scope="col">Est. cost</th>
              <th scope="col">Used in</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <th scope="row">
                  {item.name}
                  {swappedIn.has(item.name) ? (
                    <span className="chip chip--good chip--inline">swapped in</span>
                  ) : null}
                </th>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>${item.estimatedCost.toFixed(2)}</td>
                <td className="data-table__muted">{item.usedIn.join(', ')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan="2">
                Estimated total
              </th>
              <td colSpan="2">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <CheckoutPanel items={items} total={total} />
    </>
  )
}
