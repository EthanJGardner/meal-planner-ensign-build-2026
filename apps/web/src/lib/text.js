// Shared text matching, used by both the avoid gate and the taste filters.

// Enough plural handling to match a picked ingredient ("Tomatoes") against an
// ingredient as a recipe writes it ("Cherry tomatoes", "Crushed tomatoes").
export function singular(word) {
  const value = String(word).trim().toLowerCase()
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.endsWith('oes')) return value.slice(0, -2)
  if (/(ses|xes|ches|shes)$/.test(value)) return value.slice(0, -2)
  if (value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1)
  return value
}

// True when `text` names `term`, allowing for either being pluralized.
export function mentions(text, term) {
  const haystack = String(text).toLowerCase()
  const needle = singular(term)
  if (needle.length < 2) return false
  return haystack.includes(needle) || singular(haystack).includes(needle)
}
