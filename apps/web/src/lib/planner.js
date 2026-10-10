// Plan generation and the derived values the Plan view renders.
//
// A plan is a grid: weeks[week][day][slot]. Each cell names a recipe from the
// plan's own catalog rather than embedding it, so leftovers can point at the
// meal they came from and a recipe swap only has to be applied once.

import {
  COOL_OFF_DAYS,
  CURRENT_WEEK,
  CUSTOM_RECIPE_SOURCE,
  MEAL_SLOTS,
  MEAL_STATUS,
  WEEKS_IN_PLAN,
} from './constants.js'
import {
  fillsSlot,
  isRecipeCompliant,
  isRecipeSelectable,
  preferredFoodMatches,
  recipeProblems,
} from './mealFilters.js'

const DAYS_PER_WEEK = 7

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

const emptyDay = () => MEAL_SLOTS.map(() => emptySlot())
const emptyWeek = () => Array.from({ length: DAYS_PER_WEEK }, emptyDay)

export const emptyWeeks = () => Array.from({ length: WEEKS_IN_PLAN }, emptyWeek)

export function createEmptyPlan(recipes) {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    source: 'sample-data',
    recipes,
    weeks: emptyWeeks(),
    confirmedWeek: null,
    warnings: [],
  }
}

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

const flatIndex = (week, day, slotIndex) =>
  (week * DAYS_PER_WEEK + day) * MEAL_SLOTS.length + slotIndex

// Walks the whole plan in order so a leftover slot can prove its source meal
// was cooked before it.
function cookedBefore(plan, week, day, slotIndex, name) {
  const limit = flatIndex(week, day, slotIndex)

  for (let w = 0; w < plan.weeks.length; w += 1) {
    for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
      for (let s = 0; s < MEAL_SLOTS.length; s += 1) {
        if (flatIndex(w, d, s) >= limit) return false
        const cell = plan.weeks[w][d][s]
        if (!cell.leftover && cell.recipe === name) return true
      }
    }
  }

  return false
}

export function isWeekEmpty(plan, week) {
  return plan.weeks[week].every((day) => day.every((slot) => !slot.recipe))
}

export function plannedDayCount(plan, week) {
  return plan.weeks[week].filter((day) => day.some((slot) => slot.recipe)).length
}

// --- status and totals -------------------------------------------------------

// Requirement 5.3: every planned day reports either OK or the problems to fix.
function slotIssues(plan, week, day, slotIndex, preferences) {
  const slot = plan.weeks[week][day][slotIndex]
  if (!slot.recipe) return []

  const issues = []
  const recipe = findRecipe(plan, slot.recipe)

  if (!recipe) {
    issues.push(`${slot.recipe} is no longer in the recipe list`)
    return issues
  }

  for (const problem of recipeProblems(recipe, preferences)) {
    issues.push(problem.message)
  }

  if (slot.leftover && !cookedBefore(plan, week, day, slotIndex, slot.recipe)) {
    issues.push(`Cook ${slot.recipe} earlier in the plan first`)
  }

  if (slot.servings !== null && !(Number(slot.servings) >= 1)) {
    issues.push('People must be 1 or more')
  }

  return issues
}

export function dayIssues(plan, week, day, preferences) {
  return MEAL_SLOTS.flatMap((_, slotIndex) =>
    slotIssues(plan, week, day, slotIndex, preferences),
  )
}

export function dayNutrition(plan, week, day) {
  let calories = 0
  let protein = 0
  let filled = 0

  for (const slot of plan.weeks[week][day]) {
    const recipe = findRecipe(plan, slot.recipe)
    if (!recipe?.nutritionPerServing) continue
    calories += recipe.nutritionPerServing.calories ?? 0
    protein += recipe.nutritionPerServing.protein ?? 0
    filled += 1
  }

  return { calories, protein, filled }
}

export function weekCost(plan, week, preferences) {
  let total = 0

  for (const day of plan.weeks[week]) {
    for (const slot of day) {
      if (!slot.recipe || slot.leftover) continue
      const recipe = findRecipe(plan, slot.recipe)
      if (!recipe) continue
      total += recipeCostPerServing(recipe) * slotServings(slot, preferences)
    }
  }

  return round(total)
}

// The slice of the overall budget this week's planned days are entitled to.
export function allowedWeekBudget(plan, week, preferences) {
  const budget = Number(preferences.budget) || 0
  const period = Number(preferences.planningPeriod) || 1
  if (!budget) return 0
  return round((budget / period) * Math.max(plannedDayCount(plan, week), 1))
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

    // Cooking time is a preference, not a safety rule, so it is the one filter
    // we relax rather than returning an empty plan.
    if (!pool.length && safeAndCompliant.length) {
      pool = safeAndCompliant
      warnings.push(
        `No ${slot} recipe fits your time limit, so the limit was relaxed for ${slot}.`,
      )
    }

    pools[slot] = pool
  })

  return { pools, warnings }
}

const costFor = (recipe, servings) => recipeCostPerServing(recipe) * servings

// Blocked if the recipe was used within the cool-off window.
const inCoolOff = (usage, name, dayIndex) => {
  const last = usage.get(name)
  return last !== undefined && dayIndex - last <= COOL_OFF_DAYS
}

function pickDay({
  pools,
  preferences,
  dayIndex,
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
    const fresh = pool.filter((recipe) => !inCoolOff(usage, recipe.name, dayIndex))
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
        }

        if (!best || score < best.score) {
          best = { score, breakfast, lunch, dinner, cost }
        }
      }
    }
  }

  return best
}

// Fills `days` days starting at `startWeek`, leaving every other week alone.
export function generateWeeks(plan, preferences, { startWeek, days }) {
  const { pools, warnings } = buildPools(plan.recipes, preferences)

  const empty = MEAL_SLOTS.filter((slot) => !pools[slot].length)
  if (empty.length) {
    return {
      error: `No recipe is both allergy-safe and compliant for ${empty.join(', ')} with these choices. Remove an allergy or a dietary restriction and try again.`,
    }
  }

  const weeks = plan.weeks.map((week) => week.map((day) => day.map((slot) => ({ ...slot }))))
  const lastDay = Math.min(
    startWeek * DAYS_PER_WEEK + days,
    WEEKS_IN_PLAN * DAYS_PER_WEEK,
  )
  const total = lastDay - startWeek * DAYS_PER_WEEK

  for (let offset = 0; offset < total; offset += 1) {
    const absolute = startWeek * DAYS_PER_WEEK + offset
    weeks[Math.floor(absolute / DAYS_PER_WEEK)][absolute % DAYS_PER_WEEK] = emptyDay()
  }

  const servings = Math.max(1, Number(preferences.householdSize) || 1)
  const budget = Number(preferences.budget) || 0
  const weekShare = budget
    ? (budget / (Number(preferences.planningPeriod) || 1)) * total
    : 0

  // Carry the dinner from the day before this run so leftovers stay continuous
  // across a week boundary.
  let previousDinner = null
  if (startWeek > 0) {
    const handover = weeks[startWeek - 1][DAYS_PER_WEEK - 1][2]
    if (handover.recipe && !handover.leftover) {
      const recipe = findRecipe(plan, handover.recipe)
      if (recipe && pools.lunch.some((option) => option.name === recipe.name)) {
        previousDinner = recipe
      }
    }
  }

  const usage = new Map()
  let spent = 0

  for (let offset = 0; offset < total; offset += 1) {
    const absolute = startWeek * DAYS_PER_WEEK + offset
    const week = Math.floor(absolute / DAYS_PER_WEEK)
    const day = absolute % DAYS_PER_WEEK
    const remaining = total - offset
    const dayBudget = weekShare ? Math.max((weekShare - spent) / remaining, 1) : 0

    let best = pickDay({
      pools,
      preferences,
      dayIndex: offset,
      dayBudget,
      servings,
      usage,
      previousDinner,
      relaxCoolOff: false,
    })

    if (!best) {
      best = pickDay({
        pools,
        preferences,
        dayIndex: offset,
        dayBudget,
        servings,
        usage,
        previousDinner,
        relaxCoolOff: true,
      })
    }

    if (!best) {
      return {
        error:
          'We could not assemble a full day from the recipes that match your choices. Try relaxing a restriction or the time limit.',
      }
    }

    weeks[week][day][0] = { ...emptySlot(), recipe: best.breakfast.name }
    weeks[week][day][1] = {
      ...emptySlot(),
      recipe: best.lunch.recipe.name,
      leftover: best.lunch.leftover,
    }
    weeks[week][day][2] = { ...emptySlot(), recipe: best.dinner.name }

    usage.set(best.breakfast.name, offset)
    if (!best.lunch.leftover) usage.set(best.lunch.recipe.name, offset)
    usage.set(best.dinner.name, offset)

    spent += best.cost
    previousDinner = best.dinner
  }

  const overBudget = weekShare > 0 && spent > weekShare
  if (overBudget) {
    warnings.push(
      `The cheapest compliant plan we could build costs about $${round(spent).toFixed(2)}, which is over the $${round(weekShare).toFixed(2)} share of your budget for these days. Try "Fit to budget" or raise the budget.`,
    )
  }

  return { weeks, warnings, spent: round(spent) }
}

// --- editing actions ---------------------------------------------------------

// Repeating a meal close to itself is exactly what the cool-off rule exists to
// prevent, so candidates are penalised by how near their other uses are. This
// keeps swaps from collapsing a whole week onto one cheap recipe.
function varietyPenalty(weeks, week, name, day) {
  let penalty = 0

  for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
    for (const slot of weeks[week][d]) {
      if (slot.leftover || slot.recipe !== name) continue
      const gap = Math.abs(d - day)
      penalty += gap <= COOL_OFF_DAYS ? 400 / (gap + 1) : 40
    }
  }

  return penalty
}

// Requirement 5.3 applies to edits too, not just generation: a swap must never
// put the same meal back inside the cool-off window.
function violatesCoolOff(weeks, week, name, day) {
  for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
    if (Math.abs(d - day) > COOL_OFF_DAYS) continue
    for (const slot of weeks[week][d]) {
      if (!slot.leftover && slot.recipe === name) return true
    }
  }

  return false
}

// The closest compliant stand-in for a recipe that can no longer be used.
function replacementFor(weeks, recipes, recipe, slotIndex, preferences, week, day) {
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
    varietyPenalty(weeks, week, option.name, day) +
    recipeCostPerServing(option) * 5

  return [...candidates].sort((a, b) => rank(a) - rank(b))[0]
}

// The latest meal actually cooked before this slot that could fill it.
function mostRecentCooked(probe, week, day, slotIndex, preferences) {
  const slot = MEAL_SLOTS[slotIndex]

  for (let d = day; d >= 0; d -= 1) {
    const from = d === day ? slotIndex : MEAL_SLOTS.length
    for (let s = from - 1; s >= 0; s -= 1) {
      const cell = probe.weeks[week][d][s]
      if (!cell.recipe || cell.leftover) continue

      const recipe = probe.recipes.find((item) => item.name === cell.recipe)
      if (!recipe || !fillsSlot(recipe, slot)) continue
      if (!isRecipeCompliant(recipe, preferences)) continue

      return recipe.name
    }
  }

  return null
}

// Requirement 5.3: a leftover slot must reference a meal cooked earlier in the
// plan. After a swap, re-point anything orphaned at whatever did get cooked, or
// clear it when there is nothing left to reheat.
function repairLeftovers(weeks, recipes, week, preferences) {
  const probe = { weeks, recipes }

  for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
    for (let slotIndex = 0; slotIndex < MEAL_SLOTS.length; slotIndex += 1) {
      const slot = weeks[week][day][slotIndex]
      if (!slot.recipe || !slot.leftover) continue

      const recipe = recipes.find((item) => item.name === slot.recipe)
      const intact =
        recipe &&
        isRecipeCompliant(recipe, preferences) &&
        cookedBefore(probe, week, day, slotIndex, slot.recipe)

      if (intact) continue

      const source = mostRecentCooked(probe, week, day, slotIndex, preferences)
      slot.recipe = source
      slot.leftover = Boolean(source)
    }
  }
}

// Requirement 5.3: when a safety-relevant preference changes, swap the meals
// that are no longer allowed and report what moved.
export function resyncWeek(plan, week, preferences) {
  const weeks = plan.weeks.map((w) =>
    w.map((day) => day.map((slot) => ({ ...slot }))),
  )
  const changes = []

  for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
    for (let slotIndex = 0; slotIndex < MEAL_SLOTS.length; slotIndex += 1) {
      const slot = weeks[week][day][slotIndex]
      if (!slot.recipe || slot.leftover) continue

      const recipe = findRecipe(plan, slot.recipe)
      if (recipe && isRecipeCompliant(recipe, preferences)) continue

      const replacement = replacementFor(
        weeks,
        plan.recipes,
        recipe,
        slotIndex,
        preferences,
        week,
        day,
      )

      changes.push({ from: slot.recipe, to: replacement?.name ?? null })
      slot.recipe = replacement?.name ?? null
      slot.leftover = false
      slot.status = MEAL_STATUS.PENDING
      slot.saved = false
    }
  }

  repairLeftovers(weeks, plan.recipes, week, preferences)

  return { weeks, changes }
}

export function resyncPlan(plan, preferences) {
  let working = plan
  const changes = []

  // Week 0 is a completed week, kept as a record of what was actually eaten.
  for (let week = CURRENT_WEEK; week < WEEKS_IN_PLAN; week += 1) {
    const result = resyncWeek(working, week, preferences)
    if (!result.changes.length) continue
    working = { ...working, weeks: result.weeks }
    changes.push(...result.changes)
  }

  return { plan: working, changes }
}

// Requirement 5.4: swap the priciest dinners down until the week fits, telling
// the user what moved.
export function fitWeekToBudget(plan, week, preferences) {
  const limit = allowedWeekBudget(plan, week, preferences)
  if (!limit) {
    return {
      plan,
      swaps: [],
      message:
        'Set a grocery budget in Setup first, then we can fit the week to it.',
    }
  }

  const weeks = plan.weeks.map((w) =>
    w.map((day) => day.map((slot) => ({ ...slot }))),
  )
  const working = { ...plan, weeks }
  const swaps = []

  const pool = plan.recipes.filter(
    (recipe) =>
      fillsSlot(recipe, 'dinner') && isRecipeSelectable(recipe, preferences),
  )

  // Each pass downgrades the single most expensive dinner, then re-costs the
  // week. Cost strictly falls, so this terminates.
  for (let pass = 0; pass < DAYS_PER_WEEK * 2; pass += 1) {
    if (weekCost(working, week, preferences) <= limit) break

    let target = null

    for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
      const slot = weeks[week][day][2]
      if (!slot.recipe || slot.leftover) continue

      const recipe = findRecipe(working, slot.recipe)
      if (!recipe) continue

      const current = recipeCostPerServing(recipe)
      // A repeat is worth avoiding even at a few dollars more.
      const weigh = (option) =>
        recipeCostPerServing(option) +
        varietyPenalty(weeks, week, option.name, day) / 50

      const cheaper = pool
        .filter(
          (option) =>
            recipeCostPerServing(option) < current &&
            !violatesCoolOff(weeks, week, option.name, day),
        )
        .sort((a, b) => weigh(a) - weigh(b))[0]

      if (cheaper && (!target || current > target.current)) {
        target = { day, current, from: recipe.name, to: cheaper.name }
      }
    }

    if (!target) break

    weeks[week][target.day][2] = {
      ...weeks[week][target.day][2],
      recipe: target.to,
      status: MEAL_STATUS.PENDING,
      saved: false,
    }

    swaps.push({ from: target.from, to: target.to })
  }

  repairLeftovers(weeks, plan.recipes, week, preferences)

  const stillOver = weekCost(working, week, preferences) > limit

  let message
  if (!swaps.length) {
    message = stillOver
      ? 'Nothing left to swap without repeating a meal too soon. This is the cheapest week these recipes allow, so raise the budget or shorten the planning period.'
      : 'This week is already inside your budget.'
  } else {
    const examples = swaps
      .slice(0, 3)
      .map((swap) => `${swap.from} to ${swap.to}`)
      .join(', ')
    const more = swaps.length > 3 ? `, and ${swaps.length - 3} more` : ''
    message = `Swapped ${swaps.length} dinner${swaps.length > 1 ? 's' : ''} for cheaper options: ${examples}${more}.${
      stillOver
        ? ' That is as low as these recipes go without repeating a meal too soon, so raise the budget or shorten the planning period.'
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
    recipeCostPerServing(recipe) * 5

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
export function slotOptions(plan, week, day, slotIndex, preferences) {
  // A recipe the user wrote is called out so they can find it among the rest.
  const optionLabel = (recipe) =>
    recipe.source === CUSTOM_RECIPE_SOURCE
      ? `${recipe.name} (yours)`
      : recipe.name

  const options = recipesForSlot(plan, slotIndex).map((recipe) => {
    const problems = recipeProblems(recipe, preferences)
    return {
      value: encodeSlotValue(recipe.name, false),
      label: problems.length
        ? `${optionLabel(recipe)} — ${problems[0].message}`
        : optionLabel(recipe),
      unsafe: problems.some((problem) => problem.kind === 'allergy'),
      problem: problems.length > 0,
    }
  })

  const leftovers = recipesForSlot(plan, slotIndex)
    .filter((recipe) => cookedBefore(plan, week, day, slotIndex, recipe.name))
    .map((recipe) => ({
      value: encodeSlotValue(recipe.name, true),
      label: `Leftovers: ${optionLabel(recipe)}`,
      unsafe: !isRecipeCompliant(recipe, preferences),
      problem: !isRecipeCompliant(recipe, preferences),
    }))

  return { options, leftovers }
}
