# Meal Planner Product Requirements

## 1. Product Overview

### 1.1 Purpose

The product helps households create practical, personalized meal plans by combining:

- Food preferences and dietary restrictions
- Household allergies
- Nutrition goals
- Budget
- Cooking time
- Grocery-list generation

The product should provide more value than a generic recipe generator by turning these inputs into a usable meal plan and grocery workflow.

### 1.2 Mission and value proposition

FeedMe's mission is to make sure everyone in a household can eat safely and enjoy their food, whatever their allergies, diet, or budget.

For busy adults and families, FeedMe provides ease and healthy living by making weekly, custom meal plans and buying the ingredients for them.

- **Health and ease**: To help busy people and families eat well every day, without the stress of planning.
- **Safe for everyone at the table**: To make sure everyone in a household can eat safely and enjoy their food, whatever their allergies, diet, or budget.
- **Time back**: To give busy families their time back by turning healthy eating into a plan that's done for you.

**Vision**: An AI meal-planning assistant that knows what users can eat, what they enjoy, what they need nutritionally, and what they can afford. It creates personalized plans they can easily adjust.

**Core flow**: Set Preferences → Generate Meal Plan → Review Meals → Replace Meals → Save Preferences.

**What sets FeedMe apart**: An AI can generate a recipe on its own. FeedMe's value is putting Budget, Nutrition, Cooking Time, and Preferences into the same plan, with a Grocery List generated from it.

### 1.3 Hackathon priority

The primary objective is to complete and demonstrate the meal-planning experience. The product is not being sold as part of the hackathon. Business and monetization work is secondary to a working meal plan.

## 2. Users and Use Cases

### 2.1 Primary users

The primary users are households planning meals for multiple people. A household may have shared preferences, dietary restrictions, nutrition goals, allergies, budget constraints, and limited cooking time.

### 2.2 Core use cases

Users should be able to:

1. Enter household size and meal-planning preferences.
2. Identify allergies and dietary restrictions.
3. Set nutrition goals, budget, cooking-time preferences, and planning period.
4. Generate a personalized meal plan.
5. Review the recommended meals and alternatives.
6. Accept, reject, save, or replace meals.
7. Edit preferences and regenerate the plan.
8. View the ingredients and grocery list needed for the plan.

## 3. MVP Scope

### 3.1 Essential

These features are required for a working demo and must ship first:

- Personalized meal-plan generation for breakfast, lunch, and dinner
- Allergy and dietary-restriction support
- Calorie and macro goal support
- User preferences input (household size, preference and household setup form)
- Meal viewing and selection, including a best-fit recommendation with alternatives, recipe details, and ingredient quantities
- Meal variety, with a cool-off period so the same meal isn't repeated too soon in the plan
- Grocery list generation
- A simple, usable demo interface

### 3.2 High

These features round out the core flow and should ship if time allows after Essential is complete:

- Replace disliked meals
- Edit preferences and regenerate the plan
- Budget setting
- Save preferences (basic preference persistence)
- Checkout and payment for the grocery list via Stripe
- User accounts (sign-up/login), so preferences, recipes, and meal plans persist to an account rather than only local storage

### 3.3 Optional

- Custom recipes with ingredient swaps
- Preferred grocery stores
- Fridge-based meal suggestions
- Saving favorite recipes and meal plans to an account
- User-published meal plans
- Browse and save weekly plans published by other users
- Be able to add a meal plan to your calendar
- Browse plans day-by-day in addition to week-by-week, and add a single day from someone else's plan to your own calendar instead of only a full week
- A match score shown on browsed plans, estimating fit against the viewing user's own household size, budget, allergies, diet, and time-per-meal settings
- Multi-week planning (e.g. up to several weeks ahead), with the ability to view, regenerate, or clear one week at a time while leaving other weeks untouched
- An automated "fit to budget" action that swaps higher-cost meals for lower-cost alternatives until the plan is back within budget
- An undo for the most recent plan change (e.g. after copying in a browsed plan)

### 3.4 Later

- Subscriptions
- Alexa integration

### 3.5 Further future scope

The following are not part of the priority tiers above and would only be considered well beyond MVP:

- Separate meals for picky eaters or individual household members
- Repurchase history, purchase history, receipts, and templates
- Social proof and recommendation ranking based on likes or purchases
- Store price comparisons and store locations or map pins
- Mobile interfaces

Separate meals for individual household members are specifically deferred because they substantially increase planning and safety complexity.

The MVP should prioritize one clear meal-planning flow over a large number of secondary sections.

## 4. User Experience Requirements

### 4.1 Onboarding and navigation

- The initial setup should be brief and focused on information needed to generate a plan.
- Allergies should appear first because they are the highest-priority safety input.
- Other preferences should appear in a separate section after allergies.
- The initial experience may be a single scrolling page.
- If navigation becomes multi-section, the product may provide an optional tour and contextual hints for non-obvious features.

### 4.2 Main product sections

The product may be organized around the following sections:

- Household
- Menu
- Grocery
- Recipe
- Ingredients, including estimated cost
- Plan summary/stats, showing aggregated nutrition intake and cost across the plan

The final navigation and visual design should remain simple enough for the hackathon demo.

### 4.3 Meal recommendations

- The product should show one best-fit meal as the headline recommendation.
- Alternatives should be available for users who reject the recommendation.
- Users should be able to continue editing preferences and regenerating meals until they are satisfied with the plan.
- Saved or liked meals may later be used as recommendation signals.

## 5. Functional Requirements

### 5.1 Household and preferences

- The system shall collect household size.
- The system shall plan each meal for the household's number of servings.
- The system shall collect food preferences, dietary restrictions, nutrition goals, budget, cooking-time preferences, and a configurable planning period.
- The planning period should offer a small set of preset lengths (e.g. 3, 5, 7, or 14 days) rather than free-form entry.
- Dietary restrictions should be offered as a standard, selectable list (e.g. vegetarian, vegan, pescatarian, halal, kosher, low-carb, dairy-free, gluten-free) rather than free text, so meals can be filtered reliably.
- Food preferences (foods a user loves or wants to avoid) may additionally be collected as free text to bias recommendations, separate from the structured allergy and diet selections.
- The system shall allow a user to override the household serving count for an individual meal (e.g. a smaller lunch), defaulting to the household size when left unset.
- The system shall allow users to edit these values after initial setup.
- The system should offer a way to reset preferences back to defaults.
- Location should be obtained from the incoming request rather than entered manually, if location is needed.

### 5.2 Allergy and dietary safety

- Allergies shall apply to the whole household by default.
- If one household member has an allergy, generated meals shall be allergy-friendly for the entire household by default.
- The system shall offer a standard list of common allergens (e.g. peanuts, tree nuts, milk, eggs, wheat/gluten, soy, fish, shellfish, sesame) as selectable options, plus a free-text field for adding an allergen not on the list.
- The product may allow a user to remove an allergy flag when the user intentionally accepts responsibility for preparing a separate meal.
- Individual allergy profiles and separate meals are outside the MVP.
- Ingredient substitutions must not be treated as safe merely because they were suggested by the AI.
- The product must communicate that nutrition and allergy information is not medical advice and should be checked by the user.

### 5.3 Meal-plan generation

- The system shall generate a plan using the user's preferences, household size, restrictions, goals, budget, cooking-time constraints, and a configurable planning period.
- The MVP shall generate breakfast, lunch, and dinner meals for the household plan.
- Generated meals should include at least a name, meal type, servings, ingredients, quantities, preparation instructions, and estimated cooking time.
- The plan should expose nutrition and cost estimates when those values are available.
- After a plan is generated, the system shall show a summary/stats section aggregating the plan's nutrition intake (e.g. calories, macros) and total cost against the user's goals and budget.
- The system shall return alternatives when a user rejects a meal.
- The system shall enforce a cool-off period between repeats of the same meal, so the same meal does not reappear within a set number of days of the plan.
- The product may support assigning a meal slot as "leftovers" of a dinner cooked earlier in the plan, to reduce cooking effort and grocery cost; a leftover slot must reference a meal that was actually cooked earlier in that plan, and should be flagged if the source meal is later removed or changed.
- If the plan spans multiple weeks, the system should let a user view, regenerate, or clear one week at a time without disturbing other weeks, and should distinguish a past/completed week from the current and upcoming weeks.
- Each planned day should show a clear status (safe/OK vs. a problem to fix, such as an allergy conflict, a diet mismatch, an avoided food, a broken leftover reference, or an invalid serving count) alongside that day's aggregated nutrition.
- If a user changes an allergy, diet, or other safety-relevant preference after a plan exists, the system shall automatically re-check existing planned meals and swap any that are no longer safe or compliant, and shall tell the user what was changed and why.

### 5.4 Feedback and meal replacement

- Users shall be able to accept or reject a meal; accepting a meal confirms it for the plan.
- Users shall be able to save or heart a meal.
- Users shall be able to request an alternative.
- The product should support replacing an individual meal without requiring the entire plan to be regenerated, if technically feasible for the MVP.
- The MVP should support both single-meal regeneration and whole-plan regeneration, and should allow regenerating or clearing a single week within a multi-week plan.
- The product may offer an automated "fit to budget" action that swaps higher-cost meals for lower-cost alternatives until the plan (or the current week) is back within budget, and should tell the user what was swapped.
- The product should offer an undo for the most recent plan-changing action (e.g. a swap, a copy-in from a browsed plan, or a fit-to-budget pass).
- Feedback should be available for future ranking, including most-liked or most-purchased meals, and may include accept, reject, or custom feedback.
- Social proof and ranking are intentionally out of scope for the demo.

### 5.5 Grocery workflow

- The system should aggregate ingredients from the selected meals into a grocery list.
- The grocery list should account for required quantities and household servings.
- Cost estimates may be shown per ingredient or for the overall plan.
- The MVP shall support checkout and payment for the grocery list using Stripe.
- Payment handling must use Stripe-hosted checkout or Stripe Elements so that card data never touches the backend directly.
- Store price comparison and location pins are outside the core MVP.

### 5.6 Social discovery (optional)

- If implemented, the product may let users browse meal plans published by other users, split into day-by-day plans and week-by-week plans.
- Browsed plans should be ranked or scored against the viewing user's own household size, budget, allergies, diet, and time-per-meal settings, so the closest matches surface first.
- A user should be able to view a browsed plan's recipes before committing to it, then add either a full week or a single day into a chosen week of their own plan.
- Meals copied in from a browsed plan must still be checked against the viewing user's own allergies and diet, and swapped automatically if unsafe or non-compliant.
- Users should be able to publish their own current week to the shared feed.
- This feature is optional for the MVP; if it ships, it still depends on the cold-start problem of having enough published plans, which the team should address (e.g. seeding sample plans) before relying on it in a demo.

### 5.7 Data persistence and accounts

- The MVP should persist preferences and selected meals across a browser refresh, via local storage, independent of login.
- The product shall support user accounts, so a user can save recipes, save meal plans, and mark favorites, and have that data persist across devices.
- Account holders shall be able to publish a meal plan and save or browse meal plans published by other users.
- Accounts require server-side persistence beyond local storage (e.g., Firebase or a database); the specific backend is still to be decided.
- Users must be able to delete their account and associated data.
- User-submitted data sent to the AI provider should be limited to preferences and dietary restrictions, and should be discarded after the plan is finalized for the demo.

## 6. Nutrition and Cost Requirements

- Nutrition values must be labeled as estimates unless they come from a verified data source.
- Serving sizes must be reflected in nutrition and cost calculations.
- The system should identify the source or calculation method for nutrition values.
- Budget is a hard MVP constraint for meal selection, not just an estimate shown to users.
- The system should explain when a plan cannot satisfy all requested constraints.
- Nutrition and cost estimates should rely on macro values and should be treated as approximate rather than medical or exact commercial data.
- A recipe detail view should show, at minimum: name, per-serving nutrition (calories, protein), cooking time, estimated cost, flagged allergens, ingredient list, and step-by-step directions, with a visible note that the recipe is a sample/unverified and that allergen and nutrition data should be checked by the user.

Nutrition accuracy and allergy-safe substitutions are high-priority risks because incorrect output could affect user safety.

## 7. Technical Requirements

### 7.1 Proposed stack

- Frontend: React with TypeScript
- Backend: FastAPI
- Persistence for MVP: browser local storage for guests, plus server-side persistence (backend/database TBD) for account data
- AI generation: ChatGPT via API
- Payments: Stripe
- Demo deployment: team member laptop with secrets stored in a local .env file

FastAPI is preferred because meal-planning logic may later be reused by mobile or Alexa interfaces. Mixing React, Streamlit, Svelte, and Blazor is out of scope; Streamlit is only a fallback if a simpler prototype is required.

### 7.2 AI integration

- AI output should use a strict structured JSON schema rather than unvalidated free-form text.
- The backend should validate generated meals before returning them to the frontend.
- Invalid, incomplete, unsafe, or unavailable AI responses must produce an explicit user-facing error.
- API keys and other secrets must remain server-side and must not be committed to the repository.
- The application should have a demo fallback or sample data path if the AI service is unavailable.
- Meal-generation safety checks should gate ingredient substitutions against allergy constraints and the system should not suggest unsafe substitutions.

### 7.3 Accessibility and compatibility

- The primary demo flow should work in a current desktop browser.
- Forms and controls should have clear labels and usable keyboard focus states.
- Safety-critical allergy information should be visually distinct and understandable.

## 8. Success Criteria

The MVP is ready for demonstration when a test user can:

1. Enter a household size, allergies, restrictions, preferences, goals, budget, and planning period.
2. Generate a plan containing meals sized for the household.
3. Identify the recommended meal and available alternatives.
4. Reject or replace at least one meal.
5. Save or select meals and view the resulting grocery list.
6. Check out and pay for the grocery list via Stripe.
7. Refresh the browser and retain the relevant preferences and selections.
8. Understand that nutrition and allergy information requires verification.

The team should test the flow against the existing user personas, including cases involving allergies, budget constraints, household size, and meal regeneration.

## 9. Delivery Plan

1. Confirm the MVP boundary and technical stack.
2. Define the main screens and data model.
3. Build the preference and household form, with allergies first.
4. Implement structured AI meal generation and validation.
5. Display the plan, alternatives, recipes, and grocery list.
6. Add meal replacement, feedback, and local persistence.
7. Test the core personas and safety-related edge cases.
8. Polish the UI and prepare the demo.
9. Add optional features only after the success criteria are met.