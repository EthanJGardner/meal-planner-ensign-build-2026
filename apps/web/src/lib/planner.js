// Plan generation and the derived values the Plan view renders.
//
// A plan is a map of calendar dates to days: days['2026-10-14'] is an array of
// one slot per meal. Only the days the user asked for are in the map, so a plan
// can cover any set of dates, any distance ahead, with gaps.
//
// Each slot names a recipe from the plan's own catalog rather than embedding
// it, so leftovers can point at the meal they came from and an ingredient swap
// only has to be applied once.

import {
  COOL_OFF_DAYS,
  CUSTOM_RECIPE_SOURCE,
  MEAL_SLOTS,
  MEAL_STATUS,
} from './constants.js'
import {
  fillsSlot,
  isRecipeCompliant,
  isRecipeSelectable,
  preferredFoodMatches,
  recipeProblems,
} from './mealFilters.js'
import { hasSwaps } from './substitutions.js'
import {
  daysBetweenISO,
  isPastISO,
  sanitizePlanDates,
  shiftISO,
  shortDateISO,
} from './dates.js'

const round = (value, places = 2) => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`

export const emptySlot = () => ({
  recipe: null,
  leftover: false,
  servings: null,
  status: MEAL_STATUS.PENDING,
  saved: false,
})

export const emptyDay = () => MEAL_SLOTS.map(() => emptySlot())

export const cloneDays = (days = {}) =>
  Object.fromEntries(
    Object.entries(days).map(([date, slots]) => [
      date,
      slots.map((slot) => ({ ...slot })),
    ]),
  )

export function createEmptyPlan(recipes) {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    source: 'sample-data',
    recipes,
    days: {},
    confirmedDates: null,
    warnings: [],
  }
}

// --- the dates a plan covers -------------------------------------------------

// Chronological, because an ISO day string sorts the same way the calendar
// does. Past days drop out: a plan is what is still ahead of you.
export function plannedDates(plan) {
  return Object.keys(plan?.days ?? {})
    .filter((date) => plan.days[date].some((slot) => slot.recipe))
    .filter((date) => !isPastISO(date))
    .sort()
}

// Every date the Plan view shows: what has been planned, plus anything the user
// has picked but not generated yet, so a newly ticked day appears as an empty
// row rather than not at all.
export function visibleDates(plan, preferences) {
  const picked = sanitizePlanDates(preferences?.planDates ?? [])
  return [...new Set([...plannedDates(plan), ...picked])].sort()
}

export const isPlanEmpty = (plan) => plannedDates(plan).length === 0

export const dayAt = (plan, date) => plan?.days?.[date] ?? null

// --- catalog -----------------------------------------------------------------

export function findRecipe(plan, name) {
  if (!name) return null
  return plan.recipes.find((recipe) => recipe.name === name) ?? null
}

export function recipeCostPerServing(recipe) {
  return round(
    (recipe.ingredients ?? []).reduce(
      (sum, ingredient) => sum + (ingredient.cost ?? 0),
      0,
    ),
  )
}

function recipesForSlot(plan, slotIndex) {
  const slot = MEAL_SLOTS[slotIndex]
  return plan.recipes.filter((recipe) => fillsSlot(recipe, slot))
}

// --- slot helpers ------------------------------------------------------------

export const slotServings = (slot, preferences) => {
  const override = Number(slot.servings)
  return override >= 1 ? override : Math.max(1, Number(preferences.householdSize) || 1)
}

// Walks the plan in date order so a leftover slot can prove its source meal was
// cooked before it.
function cookedBefore(days, date, slotIndex, name) {
  for (const other of Object.keys(days).sort()) {
    if (other > date) break

    const limit = other === date ? slotIndex : MEAL_SLOTS.length
    for (let slot = 0; slot < limit; slot += 1) {
      const cell = days[other][slot]
      if (cell && !cell.leftover && cell.recipe === name) return true
    }
  }

  return false
}

// --- status and totals -------------------------------------------------------

// Requirement 5.3: every planned day reports either OK or the problems to fix.
function slotIssues(plan, date, slotIndex, preferences) {
  const slot = dayAt(plan, date)?.[slotIndex]
  if (!slot?.recipe) return []

  const issues = []
  const recipe = findRecipe(plan, slot.recipe)

  if (!recipe) {
    issues.push(`${slot.recipe} is no longer in the recipe list`)
    return issues
  }

  for (const problem of recipeProblems(recipe, preferences)) {
    issues.push(problem.message)
  }

  if (slot.leftover && !cookedBefore(plan.days, date, slotIndex, slot.recipe)) {
    issues.push(`Cook ${slot.recipe} on an earlier day first`)
  }

  if (slot.servings !== null && !(Number(slot.servings) >= 1)) {
    issues.push('People must be 1 or more')
  }

  return issues
}

export function dayIssues(plan, date, preferences) {
  return MEAL_SLOTS.flatMap((_, slotIndex) =>
    slotIssues(plan, date, slotIndex, preferences),
  )
}

export function dayNutrition(plan, date) {
  let calories = 0
  let protein = 0
  let filled = 0

  for (const slot of dayAt(plan, date) ?? []) {
    const recipe = findRecipe(plan, slot.recipe)
    if (!recipe?.nutritionPerServing) continue
    calories += recipe.nutritionPerServing.calories ?? 0
    protein += recipe.nutritionPerServing.protein ?? 0
    filled += 1
  }

  return { calories, protein, filled }
}

// What the whole plan costs: every planned day, scaled to the servings each
// meal is cooked for. Leftover slots buy nothing.
export function planCost(plan, preferences) {
  let total = 0

  for (const date of plannedDates(plan)) {
    for (const slot of plan.days[date]) {
      if (!slot.recipe || slot.leftover) continue
      const recipe = findRecipe(plan, slot.recipe)
      if (!recipe) continue
      total += recipeCostPerServing(recipe) * slotServings(slot, preferences)
    }
  }

  return round(total)
}

// --- generation --------------------------------------------------------------

function buildPools(recipes, preferences) {
  const warnings = []
  const pools = {}

  MEAL_SLOTS.forEach((slot) => {
    // Lunch and dinner draw from the same mains pool, so build it once.
    if (slot === 'dinner' && pools.lunch) {
      pools[slot] = pools.lunch
      return
    }

    const safeAndCompliant = recipes.filter(
      (recipe) => fillsSlot(recipe, slot) && isRecipeCompliant(recipe, preferences),
    )

    let pool = safeAndCompliant.filter((recipe) =>
      isRecipeSelectable(recipe, preferences),
    )

    // Prep time is a preference, not a safety rule, so it is the one filter we
    // relax rather than returning an empty plan.
    if (!pool.length && safeAndCompliant.length) {
      pool = safeAndCompliant
      warnings.push(
        `No ${slot} recipe fits your prep-time limit, so the limit was relaxed for ${slot}.`,
      )
    }

    pools[slot] = pool
  })

  return { pools, warnings }
}

const costFor = (recipe, servings) => recipeCostPerServing(recipe) * servings

// Blocked if the recipe was used within the cool-off window, counted in real
// calendar days so a gap in the picked dates counts towards it.
const inCoolOff = (usage, name, date) => {
  const last = usage.get(name)
  return last !== undefined && daysBetweenISO(last, date) <= COOL_OFF_DAYS
}

function pickDay({
  pools,
  preferences,
  date,
  dayBudget,
  servings,
  usage,
  previousDinner,
  relaxCoolOff,
}) {
  const goalCalories = Number(preferences.nutritionGoals?.calories) || 2000
  const goalProtein = Number(preferences.nutritionGoals?.protein) || 100

  const allowed = (pool) => {
    if (relaxCoolOff) return pool
    const fresh = pool.filter((recipe) => !inCoolOff(usage, recipe.name, date))
    return fresh.length ? fresh : pool
  }

  const breakfasts = allowed(pools.breakfast)
  const mains = allowed(pools.lunch)

  // Yesterday's dinner can be reheated for lunch at no grocery cost.
  const lunchChoices = mains.map((recipe) => ({ recipe, leftover: false }))
  if (previousDinner) {
    lunchChoices.unshift({ recipe: previousDinner, leftover: true })
  }

  let best = null

  for (const breakfast of breakfasts) {
    for (const lunch of lunchChoices) {
      for (const dinner of mains) {
        if (!lunch.leftover && lunch.recipe.name === dinner.name) continue

        const cost =
          costFor(breakfast, servings) +
          (lunch.leftover ? 0 : costFor(lunch.recipe, servings)) +
          costFor(dinner, servings)

        const calories =
          breakfast.nutritionPerServing.calories +
          lunch.recipe.nutritionPerServing.calories +
          dinner.nutritionPerServing.calories

        const protein =
          breakfast.nutritionPerServing.protein +
          lunch.recipe.nutritionPerServing.protein +
          dinner.nutritionPerServing.protein

        let score =
          (Math.abs(calories - goalCalories) / goalCalories) * 100 +
          (Math.max(0, goalProtein - protein) / goalProtein) * 80

        if (dayBudget > 0 && cost > dayBudget) {
          score += ((cost - dayBudget) / dayBudget) * 120
        }

        // Reheating is the point of leftovers, so nudge towards them.
        if (lunch.leftover) score -= 8

        for (const recipe of [breakfast, lunch.recipe, dinner]) {
          score -= preferredFoodMatches(recipe, preferences.foodPreferences).length * 8
          // A recipe that only fits because an ingredient was swapped out is a
          // fallback, not a first choice, so it loses to a natural fit.
          score += (recipe.swaps?.length ?? 0) * 12
        }

        if (!best || score < best.score) {
          best = { score, breakfast, lunch, dinner, cost }
        }
      }
    }
  }

  return best
}

// Requirement 5.3: fills exactly the dates it is given and leaves every other
// day in the plan alone, so a plan can cover Monday, Thursday and the weekend
// after next without touching the days in between.
export function generateDays(plan, preferences, { dates = [] } = {}) {
  const targets = sanitizePlanDates(dates)

  if (!targets.length) {
    return {
      error:
        'No upcoming days are picked. Choose the days you want on the calendar in Setup.',
    }
  }

  const { pools, warnings } = buildPools(plan.recipes, preferences)

  const empty = MEAL_SLOTS.filter((slot) => !pools[slot].length)
  if (empty.length) {
    return {
      error: `Nothing in the recipe list works for ${empty.join(', ')} with these choices. Take something off the list of ingredients you cannot have, or drop a dietary restriction, and try again.`,
    }
  }

  const days = cloneDays(plan.days)
  for (const date of targets) days[date] = emptyDay()

  const servings = Math.max(1, Number(preferences.householdSize) || 1)
  const budget = Number(preferences.budget) || 0
  const pickedCount = Math.max(
    sanitizePlanDates(preferences.planDates ?? []).length,
    targets.length,
  )
  // The share of the budget these days are entitled to, out of every day the
  // user picked.
  const runShare = budget ? (budget / pickedCount) * targets.length : 0

  // Leftovers only work from the calendar day immediately before, so the dinner
  // carried into this run has to belong to the day before the first target.
  let previousDinner = null
  let previousDate = null
  const handover = days[shiftISO(targets[0], -1)]?.[2]

  if (handover?.recipe && !handover.leftover) {
    const recipe = findRecipe(plan, handover.recipe)
    if (recipe && pools.lunch.some((option) => option.name === recipe.name)) {
      previousDinner = recipe
      previousDate = shiftISO(targets[0], -1)
    }
  }

  const usage = new Map()
  let spent = 0

  for (const [position, date] of targets.entries()) {
    const remaining = targets.length - position
    const dayBudget = runShare ? Math.max((runShare - spent) / remaining, 1) : 0
    const reheatable =
      previousDate && daysBetweenISO(previousDate, date) === 1
        ? previousDinner
        : null

    const options = {
      pools,
      preferences,
      date,
      dayBudget,
      servings,
      usage,
      previousDinner: reheatable,
    }

    const best =
      pickDay({ ...options, relaxCoolOff: false }) ??
      pickDay({ ...options, relaxCoolOff: true })

    if (!best) {
      return {
        error:
          'We could not assemble a full day from the recipes that match your choices. Try relaxing a restriction or the prep-time limit.',
      }
    }

    days[date][0] = { ...emptySlot(), recipe: best.breakfast.name }
    days[date][1] = {
      ...emptySlot(),
      recipe: best.lunch.recipe.name,
      leftover: best.lunch.leftover,
    }
    days[date][2] = { ...emptySlot(), recipe: best.dinner.name }

    usage.set(best.breakfast.name, date)
    if (!best.lunch.leftover) usage.set(best.lunch.recipe.name, date)
    usage.set(best.dinner.name, date)

    spent += best.cost
    previousDinner = best.dinner
    previousDate = date
  }

  if (runShare > 0 && spent > runShare) {
    warnings.push(
      `The cheapest plan we could build for these days costs about $${round(spent).toFixed(2)}, which is over the $${round(runShare).toFixed(2)} they are entitled to out of your budget. Try "Fit to budget" or raise the budget.`,
    )
  }

  return { days, warnings, spent: round(spent) }
}

// --- editing actions ---------------------------------------------------------

// Repeating a meal close to itself is exactly what the cool-off rule exists to
// prevent, so candidates are penalised by how near their other uses are. This
// keeps swaps from collapsing a whole plan onto one cheap recipe.
function varietyPenalty(days, name, date) {
  let penalty = 0

  for (const other of Object.keys(days)) {
    for (const slot of days[other]) {
      if (slot.leftover || slot.recipe !== name) continue
      const gap = Math.abs(daysBetweenISO(other, date))
      penalty += gap <= COOL_OFF_DAYS ? 400 / (gap + 1) : 40
    }
  }

  return penalty
}

// Requirement 5.3 applies to edits too, not just generation: a swap must never
// put the same meal back inside the cool-off window.
function violatesCoolOff(days, name, date) {
  for (const other of Object.keys(days)) {
    if (Math.abs(daysBetweenISO(other, date)) > COOL_OFF_DAYS) continue
    for (const slot of days[other]) {
      if (!slot.leftover && slot.recipe === name) return true
    }
  }

  return false
}

// The closest compliant stand-in for a recipe that can no longer be used.
function replacementFor(days, recipes, recipe, slotIndex, preferences, date) {
  const slot = MEAL_SLOTS[slotIndex]

  const candidates = recipes.filter(
    (option) =>
      option.name !== recipe?.name &&
      fillsSlot(option, slot) &&
      isRecipeCompliant(option, preferences),
  )
  if (!candidates.length) return null

  const target = recipe?.nutritionPerServing?.calories ?? 0
  const rank = (option) =>
    Math.abs((option.nutritionPerServing?.calories ?? 0) - target) +
    varietyPenalty(days, option.name, date) +
    recipeCostPerServing(option) * 5 +
    // Prefer a recipe that fits as written over one that needed a swap.
    (option.swaps?.length ?? 0) * 60

  return [...candidates].sort((a, b) => rank(a) - rank(b))[0]
}

// The latest meal actually cooked before this slot that could fill it.
function mostRecentCooked(days, recipes, date, slotIndex, preferences) {
  const slot = MEAL_SLOTS[slotIndex]
  const earlier = Object.keys(days)
    .sort()
    .filter((other) => other <= date)
    .reverse()

  for (const other of earlier) {
    const from = other === date ? slotIndex : MEAL_SLOTS.length
    for (let index = from - 1; index >= 0; index -= 1) {
      const cell = days[other][index]
      if (!cell.recipe || cell.leftover) continue

      const recipe = recipes.find((item) => item.name === cell.recipe)
      if (!recipe || !fillsSlot(recipe, slot)) continue
      if (!isRecipeCompliant(recipe, preferences)) continue

      return recipe.name
    }
  }

  return null
}

// Requirement 5.3: a leftover slot must reference a meal cooked earlier in the
// plan, on the day before. After a swap, re-point anything orphaned at whatever
// did get cooked, or clear it when there is nothing left to reheat.
function repairLeftovers(days, recipes, preferences) {
  for (const date of Object.keys(days).sort()) {
    for (let slotIndex = 0; slotIndex < MEAL_SLOTS.length; slotIndex += 1) {
      const slot = days[date][slotIndex]
      if (!slot.recipe || !slot.leftover) continue

      const recipe = recipes.find((item) => item.name === slot.recipe)
      const intact =
        recipe &&
        isRecipeCompliant(recipe, preferences) &&
        cookedBefore(days, date, slotIndex, slot.recipe)

      if (intact) continue

      const source = mostRecentCooked(days, recipes, date, slotIndex, preferences)
      slot.recipe = source
      slot.leftover = Boolean(source)
    }
  }
}

// Requirement 5.3: when a safety-relevant preference changes, swap the meals
// that are no longer allowed and report what moved.
export function resyncPlan(plan, preferences) {
  const days = cloneDays(plan.days)
  const changes = []

  for (const date of Object.keys(days).sort()) {
    // A day already behind us is a record of what was eaten, not something to
    // correct.
    if (isPastISO(date)) continue

    for (let slotIndex = 0; slotIndex < MEAL_SLOTS.length; slotIndex += 1) {
      const slot = days[date][slotIndex]
      if (!slot.recipe || slot.leftover) continue

      const recipe = findRecipe(plan, slot.recipe)
      if (recipe && isRecipeCompliant(recipe, preferences)) continue

      const replacement = replacementFor(
        days,
        plan.recipes,
        recipe,
        slotIndex,
        preferences,
        date,
      )

      changes.push({ date, from: slot.recipe, to: replacement?.name ?? null })
      slot.recipe = replacement?.name ?? null
      slot.leftover = false
      slot.status = MEAL_STATUS.PENDING
      slot.saved = false
    }
  }

  if (!changes.length) return { plan, changes }

  repairLeftovers(days, plan.recipes, preferences)
  return { plan: { ...plan, days }, changes }
}

// Requirement 5.4: swap the priciest dinners down until the plan fits, telling
// the user what moved.
export function fitPlanToBudget(plan, preferences) {
  const limit = Number(preferences.budget) || 0
  if (!limit) {
    return {
      plan,
      swaps: [],
      message:
        'Set a grocery budget in Setup first, then we can fit the plan to it.',
    }
  }

  const days = cloneDays(plan.days)
  let working = { ...plan, days }
  const swaps = []

  const pool = plan.recipes.filter(
    (recipe) =>
      fillsSlot(recipe, 'dinner') && isRecipeSelectable(recipe, preferences),
  )

  const dates = plannedDates(working)

  // Each pass downgrades the single most expensive dinner, then re-costs the
  // plan. Cost strictly falls, so this terminates.
  for (let pass = 0; pass < dates.length * 2 + 2; pass += 1) {
    if (planCost(working, preferences) <= limit) break

    let target = null

    for (const date of dates) {
      const slot = days[date]?.[2]
      if (!slot?.recipe || slot.leftover) continue

      const recipe = findRecipe(working, slot.recipe)
      if (!recipe) continue

      const current = recipeCostPerServing(recipe)
      // A repeat is worth avoiding even at a few dollars more.
      const weigh = (option) =>
        recipeCostPerServing(option) + varietyPenalty(days, option.name, date) / 50

      const cheaper = pool
        .filter(
          (option) =>
            recipeCostPerServing(option) < current &&
            !violatesCoolOff(days, option.name, date),
        )
        .sort((a, b) => weigh(a) - weigh(b))[0]

      if (cheaper && (!target || current > target.current)) {
        target = { date, current, from: recipe.name, to: cheaper.name }
      }
    }

    if (!target) break

    days[target.date][2] = {
      ...days[target.date][2],
      recipe: target.to,
      status: MEAL_STATUS.PENDING,
      saved: false,
    }

    swaps.push({ date: target.date, from: target.from, to: target.to })
    working = { ...plan, days }
  }

  repairLeftovers(days, plan.recipes, preferences)
  working = { ...plan, days }

  const stillOver = planCost(working, preferences) > limit

  let message
  if (!swaps.length) {
    message = stillOver
      ? 'Nothing left to swap without repeating a meal too soon. This is the cheapest plan these recipes allow, so raise the budget or pick fewer days.'
      : 'This plan is already inside your budget.'
  } else {
    // A day can be downgraded more than once on the way to the budget, so the
    // count is of days changed, not of passes made.
    const changedDays = new Set(swaps.map((swap) => swap.date)).size
    const examples = swaps
      .slice(0, 3)
      .map((swap) => `${swap.from} to ${swap.to} on ${shortDateISO(swap.date)}`)
      .join(', ')
    const more = swaps.length > 3 ? `, and ${swaps.length - 3} more` : ''
    message = `Swapped the dinner on ${changedDays} ${changedDays === 1 ? 'day' : 'days'} for cheaper options: ${examples}${more}.${
      stillOver
        ? ' That is as low as these recipes go without repeating a meal too soon, so raise the budget or pick fewer days.'
        : ''
    }`
  }

  return { plan: working, swaps, message }
}

// Requirement 4.3: the planned meal is the headline pick, and these are the
// alternatives offered when the user rejects it.
export function alternativesFor(plan, name, slotIndex, preferences, limit = 3) {
  const slot = MEAL_SLOTS[slotIndex]
  const current = findRecipe(plan, name)
  const target = current?.nutritionPerServing?.calories ?? 0

  const rank = (recipe) =>
    Math.abs((recipe.nutritionPerServing?.calories ?? 0) - target) +
    recipeCostPerServing(recipe) * 5 +
    (recipe.swaps?.length ?? 0) * 60

  return plan.recipes
    .filter(
      (recipe) =>
        recipe.name !== name &&
        fillsSlot(recipe, slot) &&
        isRecipeCompliant(recipe, preferences),
    )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit)
}

// --- dropdown options --------------------------------------------------------

export const SLOT_VALUE_EMPTY = ''
export const encodeSlotValue = (recipe, leftover) =>
  recipe ? `${leftover ? 'leftover' : 'recipe'}::${recipe}` : SLOT_VALUE_EMPTY

export function decodeSlotValue(value) {
  if (!value) return { recipe: null, leftover: false }
  const [kind, ...rest] = value.split('::')
  return { recipe: rest.join('::'), leftover: kind === 'leftover' }
}

// Every recipe that can fill this slot, plus leftovers of anything already
// cooked earlier in the plan.
export function slotOptions(plan, date, slotIndex, preferences) {
  // A recipe the user wrote is called out so they can find it among the rest,
  // and so is one that only fits because an ingredient was swapped.
  const optionLabel = (recipe) => {
    const notes = []
    if (recipe.source === CUSTOM_RECIPE_SOURCE) notes.push('yours')
    if (hasSwaps(recipe)) notes.push('ingredient swapped')
    return notes.length ? `${recipe.name} (${notes.join(', ')})` : recipe.name
  }

  const options = recipesForSlot(plan, slotIndex).map((recipe) => {
    const problems = recipeProblems(recipe, preferences)
    return {
      value: encodeSlotValue(recipe.name, false),
      label: problems.length
        ? `${optionLabel(recipe)} — ${problems[0].message}`
        : optionLabel(recipe),
      unsafe: problems.some((problem) => problem.kind === 'avoid'),
      problem: problems.length > 0,
    }
  })

  const leftovers = recipesForSlot(plan, slotIndex)
    .filter((recipe) => cookedBefore(plan.days, date, slotIndex, recipe.name))
    .map((recipe) => ({
      value: encodeSlotValue(recipe.name, true),
      label: `Leftovers: ${optionLabel(recipe)}`,
      unsafe: !isRecipeCompliant(recipe, preferences),
      problem: !isRecipeCompliant(recipe, preferences),
    }))

  return { options, leftovers }
}
