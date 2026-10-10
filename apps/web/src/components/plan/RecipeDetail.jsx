import { CUSTOM_RECIPE_SOURCE } from '../../lib/constants'
import { describeSwaps, hasSwaps } from '../../lib/substitutions'

const money = (value) => (value == null ? '—' : `$${Number(value).toFixed(2)}`)
const round = (value) => Math.round(value * 100) / 100

// Requirement 6: the reader has to be able to tell whose numbers these are.
const SOURCE_NOTES = {
  [CUSTOM_RECIPE_SOURCE]:
    'Your own recipe. The nutrition, allergens and prices are the values you entered and have not been verified.',
  sample:
    'Sample recipe. Nutrition, allergens and prices are estimates and are not verified.',
  planner:
    'Generated recipe. Nutrition, allergens and prices are estimates and are not verified.',
}

// Requirement 6: name, per-serving nutrition, prep time, estimated cost,
// flagged allergens, ingredients and directions, with the estimate caveat.
export function RecipeDetail({ recipe, servings, conflicts = [] }) {
  const nutrition = recipe.nutritionPerServing
  const perServingCost = recipe.ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.cost ?? 0),
    0,
  )

  // Requirement 5.4: an ingredient we changed is named here, next to the
  // ingredient list it changed.
  const swappedIn = new Set((recipe.swaps ?? []).map((swap) => swap.to))

  return (
    <div className="recipe">
      <p className="recipe__meta">
        Per serving · about {nutrition.calories} kcal · {nutrition.protein} g
        protein · {recipe.cookTimeMinutes} min prep · about{' '}
        {money(perServingCost)} (estimates)
      </p>

      {hasSwaps(recipe) ? (
        <p className="recipe__swaps">
          {describeSwaps(recipe)} The ingredient list and the cost below follow
          the swap. The nutrition figures are still the original recipe&rsquo;s
          estimate, and the directions may name the ingredient we replaced, so
          read the label on whatever you buy instead.
        </p>
      ) : null}

      {recipe.allergens.length ? (
        <p className={conflicts.length ? 'recipe__allergens is-conflict' : 'recipe__allergens'}>
          Contains: {recipe.allergens.join(', ')}
          {conflicts.length
            ? ` — this conflicts with ${conflicts.join(', ')} in your setup.`
            : ''}
        </p>
      ) : null}

      <section className="recipe__section">
        <h3 className="recipe__heading">
          Nutrition per serving (
          {recipe.source === CUSTOM_RECIPE_SOURCE ? 'yours' : 'estimated'})
        </h3>
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
                <td>
                  {ingredient.name}
                  {swappedIn.has(ingredient.name) ? (
                    <span className="chip chip--good chip--inline">swapped in</span>
                  ) : null}
                </td>
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
          Directions · about {recipe.cookTimeMinutes} min prep
        </h3>
        <ol className="recipe__steps">
          {recipe.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <p className="fine-print">
        {SOURCE_NOTES[recipe.source] ?? SOURCE_NOTES.planner} Check the product
        labels yourself before cooking.
      </p>
    </div>
  )
}
