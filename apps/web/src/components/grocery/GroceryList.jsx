import { useGroceryList } from '../../hooks/useGroceryList'
import { useHousehold } from '../../hooks/useHousehold'
import { CheckoutPanel } from './CheckoutPanel'

export function GroceryList() {
  const { items, total, mealCount, week } = useGroceryList()
  const { preferences } = useHousehold()

  return (
    <>
      <p className="panel__lede">
        Built from the {mealCount} {mealCount === 1 ? 'meal' : 'meals'} you
        confirmed in Week {week + 1}, sized for your household of{' '}
        {preferences.householdSize}. Leftover slots buy nothing extra.
      </p>

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
                <th scope="row">{item.name}</th>
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
