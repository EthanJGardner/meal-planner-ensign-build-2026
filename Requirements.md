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

The product should make meal planning easier, more affordable, and more suitable for each household. The final mission statement, vision, and value proposition still need to be written and should be completed before the presentation.

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

## 3. Product Scope

### 3.1 MVP scope

The MVP should include:

- A preference and household setup form
- Allergy and dietary-restriction capture
- Household serving-size support
- Personalized meal-plan generation
- A best-fit meal recommendation with alternatives
- Meal acceptance, rejection, saving, and replacement
- Editable preferences and plan regeneration
- Basic preference persistence
- Recipe details and ingredient quantities
- A grocery list
- A simple, usable demo interface

The MVP should prioritize one clear meal-planning flow over a large number of secondary sections.

### 3.2 Post-MVP or optional scope

The following features may be added only if the MVP is complete:

- Fridge-based meal suggestions
- Separate meals for picky eaters or individual household members
- Favorites, repurchase history, purchase history, receipts, and templates
- Social proof and recommendation ranking based on likes or purchases
- Store price comparisons
- Store locations or map pins
- Subscriptions and monetization
- Cross-device persistence
- Interfaces for mobile or Alexa

Separate meals for individual household members are specifically deferred because they substantially increase planning and safety complexity.

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
- The system shall collect food preferences, dietary restrictions, nutrition goals, budget, cooking-time preferences, and planning period.
- The system shall allow users to edit these values after initial setup.
- Location should be obtained from the incoming request rather than entered manually, if location is needed.

### 5.2 Allergy and dietary safety

- Allergies shall apply to the whole household by default.
- If one household member has an allergy, generated meals shall be allergy-friendly for the entire household by default.
- The product may allow a user to remove an allergy flag when the user intentionally accepts responsibility for preparing a separate meal.
- Individual allergy profiles and separate meals are outside the MVP.
- Ingredient substitutions must not be treated as safe merely because they were suggested by the AI.
- The product must communicate that nutrition and allergy information is not medical advice and should be checked by the user.

### 5.3 Meal-plan generation

- The system shall generate a plan using the user's preferences, household size, restrictions, goals, budget, cooking-time constraints, and planning period.
- Generated meals should include at least a name, meal type, servings, ingredients, quantities, preparation instructions, and estimated cooking time.
- The plan should expose nutrition and cost estimates when those values are available.
- The system shall return alternatives when a user rejects a meal.

### 5.4 Feedback and meal replacement

- Users shall be able to accept or reject a meal.
- Users shall be able to save or heart a meal.
- Users shall be able to request an alternative.
- The product should support replacing an individual meal without requiring the entire plan to be regenerated, if technically feasible for the MVP.
- Feedback should be available for future ranking, including most-liked or most-purchased meals.

### 5.5 Grocery workflow

- The system should aggregate ingredients from the selected meals into a grocery list.
- The grocery list should account for required quantities and household servings.
- Cost estimates may be shown per ingredient or for the overall plan.
- Store purchasing, price comparison, and location pins are outside the core MVP.

### 5.6 Data persistence and accounts

- The MVP should persist preferences and selected meals across a browser refresh.
- Browser local storage is the preferred MVP persistence approach.
- Account creation and Firebase-based cross-device persistence remain future options unless the team decides otherwise.
- If accounts are implemented, users must be able to delete their account and associated data.

## 6. Nutrition and Cost Requirements

- Nutrition values must be labeled as estimates unless they come from a verified data source.
- Serving sizes must be reflected in nutrition and cost calculations.
- The system should identify the source or calculation method for nutrition values.
- Budget behavior must be defined before budget is treated as a hard planning constraint.
- The system should explain when a plan cannot satisfy all requested constraints.

Nutrition accuracy and allergy-safe substitutions are high-priority risks because incorrect output could affect user safety.

## 7. Technical Requirements

### 7.1 Proposed stack

- Frontend: React with TypeScript
- Backend: FastAPI
- Persistence for MVP: browser local storage
- AI generation: provider and model to be selected

FastAPI is preferred because meal-planning logic may later be reused by mobile or Alexa interfaces. Mixing React, Streamlit, Svelte, and Blazor is out of scope; Streamlit is only a fallback if a simpler prototype is required.

### 7.2 AI integration

- AI output should use a strict structured schema rather than unvalidated free-form text.
- The backend should validate generated meals before returning them to the frontend.
- Invalid, incomplete, unsafe, or unavailable AI responses must produce an explicit user-facing error.
- API keys and other secrets must remain server-side and must not be committed to the repository.
- The application should have a demo fallback or sample data path if the AI service is unavailable.

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
6. Refresh the browser and retain the relevant preferences and selections.
7. Understand that nutrition and allergy information requires verification.

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

## 10. Open Questions and Decisions Needed

### Product scope

1. Is budget a hard MVP constraint, an estimate shown to users, or a post-MVP feature?
2. Is grocery-list generation required for the MVP or only recommended?
3. What is the exact planning period for the demo: one day, one week, or a configurable range?
4. Which meal types are required: breakfast, lunch, dinner, snacks, or all four?
5. Are users selecting meals individually, accepting a complete plan, or both?
6. Should users be able to lock selected meals while regenerating the rest?
7. Is fridge-based suggestion functionality excluded from the demo?
8. What features are explicitly out of scope under the hackathon timeframe?

### Feedback and recommendations

9. What does “accept” a meal do: save it, add it to the grocery list, or confirm it for the plan?
10. Should the MVP support single-meal regeneration, whole-plan regeneration, or both?
11. Should feedback be limited to accept/reject/save, or should users provide free-form feedback?
12. Should social proof and ranking be excluded until real usage data exists?

### Nutrition, allergies, and safety

13. Which nutrition database or calculation source will be used?
14. Which nutrition fields are required, and how will values be validated?
15. How will ingredient substitutions be checked against allergies?
16. How should the system respond when no meal satisfies all restrictions?
17. Which disclaimers and safety warnings are required?
18. Are allergies, intolerances, and dietary preferences represented as separate input types?

### Accounts and data

19. Is the demo local-storage-only, or will account creation be implemented?
20. If accounts are implemented, what authentication provider will be used?
21. What data is sent to the AI provider, and how long is it retained?
22. What exactly must account deletion remove?
23. If local storage is used, is losing data when browser storage is cleared acceptable?

### AI and technical delivery

24. Which AI model and API will power generation?
25. What structured response schema will the model return?
26. What is the fallback behavior when the AI service fails or returns invalid data?
27. Where will the demo be hosted, and how will secrets be configured?
28. Is React + FastAPI confirmed, or is a Streamlit prototype preferred?

### Business, branding, and presentation

29. What are the product name, brand, and color palette?
30. What are the final mission statement, vision, and value proposition?
31. What do the hackathon rules require regarding business viability, marketing, or monetization?
32. Is subscription functionality out of scope? If not, should users be able to cancel?
33. What does “pin info” mean: store locations, map pins, or something else?
34. Are store price comparisons and location data required for the final presentation?
