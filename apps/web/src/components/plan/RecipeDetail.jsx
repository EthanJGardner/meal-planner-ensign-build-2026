const money = (value) => (value == null ? '—' : `$${Number(value).toFixed(2)}`)
const round = (value) => Math.round(value * 100) / 100

// Requirement 6: name, per-serving nutrition, cooking time, estimated cost,
// flagged allergens, ingredients and directions, with the estimate caveat.
export function RecipeDetail({ recipe, servings, conflicts = [] }) {
  const nutrition = recipe.nutritionPerServing
  const perServingCost = recipe.ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.cost ?? 0),
    0,
  )

  return (
    <div className="recipe">
      <p className="recipe__meta">
        Per serving · about {nutrition.calories} kcal · {nutrition.protein} g
        protein · {recipe.cookTimeMinutes} min · about{' '}
        {money(perServingCost)} (estimates)
      </p>

      {recipe.allergens.length ? (
        <p className={conflicts.length ? 'recipe__allergens is-conflict' : 'recipe__allergens'}>
          Contains: {recipe.allergens.join(', ')}
          {conflicts.length
            ? ` — this conflicts with ${conflicts.join(', ')} in your setup.`
            : ''}
        </p>
      ) : null}

      <section className="recipe__section">
        <h3 className="recipe__heading">Nutrition per serving (estimated)</h3>
        <ul className="macro-list">
          <li>
            <span>{nutrition.calories}</span> kcal
          </li>
          <li>
            <span>{nutrition.protein}g</span> protein
          </li>
          <li>
            <span>{nutrition.carbs}g</span> carbs
          </li>
          <li>
            <span>{nutrition.fat}g</span> fat
          </li>
        </ul>
        <p className="recipe__source">
          Source: {recipe.nutritionSource ?? 'Estimated from recipe macros'}.
        </p>
      </section>

      <section className="recipe__section">
        <h3 className="recipe__heading">
          Ingredients for {servings} {servings === 1 ? 'serving' : 'servings'}
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col">Amount</th>
              <th scope="col">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ingredient) => (
              <tr key={`${ingredient.name}-${ingredient.unit}`}>
                <td>{ingredient.name}</td>
                <td>
                  {round(ingredient.quantity * servings)} {ingredient.unit}
                </td>
                <td>{money(round((ingredient.cost ?? 0) * servings))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan="2">
                Meal total
              </th>
              <td>{money(round(perServingCost * servings))}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="recipe__section">
        <h3 className="recipe__heading">
          Directions · about {recipe.cookTimeMinutes} min
        </h3>
        <ol className="recipe__steps">
          {recipe.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <p className="fine-print">
        {recipe.source === 'sample'
          ? 'Sample recipe. Nutrition, allergens and prices are estimates and are not verified.'
          : 'Generated recipe. Nutrition, allergens and prices are estimates and are not verified.'}{' '}
        Check the product labels yourself before cooking.
      </p>
    </div>
  )
}
