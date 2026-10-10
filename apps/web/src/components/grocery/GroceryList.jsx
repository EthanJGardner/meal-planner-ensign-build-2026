import { useGroceryList } from '../../hooks/useGroceryList'
import { CheckoutPanel } from './CheckoutPanel'

export function GroceryList() {
  const { items, total, mealCount, servings } = useGroceryList()

  return (
    <section className="panel" id="grocery" aria-labelledby="grocery-title">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="grocery-title">
            Grocery list
          </h2>
          <p className="panel__subtitle">
            Built from your {mealCount} accepted{' '}
            {mealCount === 1 ? 'meal' : 'meals'}, sized for {servings}{' '}
            {servings === 1 ? 'serving' : 'servings'} each.
          </p>
        </div>
      </header>

      {items.length ? (
        <>
          <table className="ingredient-table ingredient-table--grocery">
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
                  <td>{item.name}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>${item.estimatedCost.toFixed(2)}</td>
                  <td className="ingredient-table__used-in">
                    {[...new Set(item.usedIn)].join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <CheckoutPanel items={items} total={total} />
        </>
      ) : (
        <p className="panel__empty">
          Accept a meal and its ingredients show up here, combined across the
          whole plan.
        </p>
      )}
    </section>
  )
}
