const money = (value) =>
  value == null ? '—' : `$${Number(value).toFixed(2)}`

export function RecipeDetail({ meal }) {
  const nutrition = meal.nutritionPerServing

  return (
    <div className="recipe">
      <div className="recipe__section">
        <h4 className="recipe__heading">Nutrition per serving (estimated)</h4>
        {nutrition ? (
          <ul className="macro-list">
            <li>
              <span>{nutrition.calories}</span> cal
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
        ) : (
          <p className="recipe__empty">
            No nutrition estimate is available for this meal.
          </p>
        )}
        <p className="recipe__source">
          Source: {meal.nutritionSource}. Estimates only — verify anything
          safety-critical.
        </p>
      </div>

      <div className="recipe__section">
        <h4 className="recipe__heading">
          Ingredients for {meal.servings}{' '}
          {meal.servings === 1 ? 'serving' : 'servings'}
        </h4>
        <table className="ingredient-table">
          <thead>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col">Amount</th>
              <th scope="col">Est. cost</th>
            </tr>
          </thead>
          <tbody>
            {meal.ingredients.map((ingredient) => (
              <tr key={`${ingredient.name}-${ingredient.unit}`}>
                <td>{ingredient.name}</td>
                <td>
                  {ingredient.quantity} {ingredient.unit}
                </td>
                <td>{money(ingredient.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan="2">
                Meal total
              </th>
              <td>{money(meal.estimatedCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="recipe__section">
        <h4 className="recipe__heading">
          Steps · about {meal.cookTimeMinutes} min
        </h4>
        <ol className="recipe__steps">
          {meal.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
