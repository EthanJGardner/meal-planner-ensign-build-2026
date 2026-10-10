export function MealAlternatives({ alternatives, onChoose }) {
  if (!alternatives.length) {
    return (
      <p className="alternatives__empty">
        No other option is available for this slot. Try swapping for a fresh
        suggestion or widening your preferences.
      </p>
    )
  }

  return (
    <ul className="alternatives">
      {alternatives.map((alternative) => (
        <li key={alternative.name} className="alternatives__item">
          <div>
            <p className="alternatives__name">{alternative.name}</p>
            <p className="alternatives__meta">
              {alternative.cookTimeMinutes} min · $
              {Number(alternative.estimatedCost).toFixed(2)}
              {alternative.nutritionPerServing
                ? ` · ${alternative.nutritionPerServing.calories} cal/serving`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="button"
            onClick={() => onChoose(alternative)}
          >
            Use this
          </button>
        </li>
      ))}
    </ul>
  )
}
