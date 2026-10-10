export function SafetyDisclaimer() {
  return (
    <aside className="disclaimer" aria-label="Safety information">
      <h3 className="disclaimer__title">Check this before you cook</h3>
      <ul className="disclaimer__list">
        <li>
          Nutrition and cost figures are estimates calculated from recipe macro
          values. They are not medical or exact commercial data.
        </li>
        <li>
          Allergy filtering is a starting point, not a guarantee. Read every
          product label yourself, including for ingredient substitutions.
        </li>
        <li>
          Nothing here is medical or dietary advice. Confirm anything
          safety-critical with a qualified professional.
        </li>
      </ul>
    </aside>
  )
}
