# Requirements

## User Journey
1. Open the app.
2. One-time setup: food preferences, allergies, dietary restrictions, nutrition goals, budget and plan period.
3. AI generates a personalized plan.
4. User reviews the meals and picks the ones they want.
5. User accepts or rejects meals and requests alternatives.
6. User returns later to edit preferences, budget or goals.

## Technical Direction
* **Frontend:** React is preferred. It's flexible, the team knows it, and AI coding tools support it well. Streamlit is the quicker fallback for simple prototypes.
* **Backend:** FastAPI is proposed. It keeps the meal-planning logic reusable for future mobile or Alexa interfaces.
* **Auth and storage:** Still undecided. The likely MVP approach is browser local storage, with Firebase added later for cross-device persistence. The team originally wanted to skip accounts, then reconsidered once they talked about preferences persisting after a refresh.
* **Micro frontends:** Mixing React, Streamlit, Svelte and Blazor was judged interesting but unnecessary for the hackathon.

## Extra Feature Ideas
* **Fridge-based suggestions:** Enter the ingredients you have, and the app suggests what to cook. For example, at 10 PM with the stores closed and five ingredients on hand. Interesting, but likely post-MVP.
* **Budget management:** Plans that fit a set food budget.
Time-based recommendations: Different meals by time of day or situation. The behavior is still undefined.
* **Subscription:** Pricing and features not decided.

## Open Questions
1. Google login, or local storage only? (Hosted locally)
2. Include budget management in v1?
3. How will users give feedback on meals?
4. Can users regenerate single meals, or only whole plans?
5. How will nutrition info be calculated and validated?
6. How can ingredient substitutions be made safe for people with allergies?
7. Should fridge-based suggestions be in the demo?
8. Which AI model or API will power generation?
9. What should the final UI look like?
10. Which features are realistic within the hackathon timeframe?

## Next Steps
1. Finalize the MVP feature list and confirm the stack (React + FastAPI).
2. Define the main screens and user journey.
3. Build the preference input form.
4. Connect AI meal generation and display a weekly plan.
5. Add meal replacement and feedback.
6. Implement basic preference storage.
7. Test with the existing user personas.
8. Polish the UI/UX and prepare the demo.
9. Add optional features if time allows.

**Biggest risks:** allergy-safe substitutions and nutrition accuracy. Both affect user safety, so they're worth deciding early.

## Follow-up Discussion: Additional Decisions and Ideas
Notes from a later conversation, organized by topic. Items are proposals unless marked otherwise.

### Accounts and Data
* Users should be able to create an account, though the team is still weighing this against local storage.
* Most preferences could live in browser local storage, which avoids needing accounts and is probably easier for the MVP.
* Users must be able to **delete their account** (compliance requirement).
* Subscriptions: the transcript says users should *not* be able to cancel. This is most likely a transcription slip for *should* be able to cancel. **Please confirm.**
* Location: take it from the incoming request rather than asking the user.

### Household and Family Meals
* Users enter family size in their preferences. Each meal is then planned for that many servings (e.g., a family of five gets five servings of breakfast, lunch and dinner).
* **Allergies apply to the whole household by default.** If one person has an allergy, every meal is allergy-friendly, since severity is unknown and cross-contact in the home is a concern.
* If the allergy is mild, the user can remove the allergy flag and cook that person's meal separately (for example, leaving an ingredient out of one dish).
* Users can keep editing allergies and preferences and regenerating until they find a plan they like, then decide to buy.
* Separate meals for picky eaters or individual family members is a nice-to-have for later, because it adds a lot of complexity.

### Recommendations and Ranking
* Show one **best-fit meal** as the headline suggestion, with alternatives available.
* Add social proof once there is data, for example "this many people liked this" or the most-favorited meal among low-carb users.
* Ranking could use simple signals such as **most liked** (hearted/saved) or **most bought**.


### Preferences Layout
* Allergies come first in the form because they are the most important.
* Other preferences go in a separate area after allergies.

### Onboarding and Navigation
* Mild onboarding instead of a full tutorial: small icons or callouts showing where things are (where to save, where to edit).
* The app is currently imagined as a single scrolling page, where a tutorial may be unnecessary.
* If more tabs are added (favorites, repurchase, purchase history, receipts, templates), hints become more useful.
* The likely approach is a hybrid: an optional tour, plus hints for non-obvious features such as the "for you" split, templates and receipts.
* If the team disagrees, this item can be dropped.

### Possible App Sections
Household, Menu, Grocery, Recipe, Ingredients (with a cost estimate for each).

### Open Items
* Confirm the subscription cancellation wording above.
* The business-side discussion was cut off and is not captured here.

## Business and Brand Discussion

### Brand Questions to Settle
* What should the brand be, and what colors represent it?
* What is the reason for the product, and what goal are we trying to achieve?

### How Far to Take the Business Side
The team raised several questions about scope: whether people would pay for the product, whether to think about profitability, whether marketing matters, or whether to focus on mission value.
* **Direction so far:** the idea matters more than selling it. The product is not being sold as part of the hackathon.
* **First priority:** finish the meal plan.
* **If time allows afterwards:** find the stores with the cheapest prices and add the "pin" info (the transcript is unclear on this; it may mean store location pins).
* Review the **hackathon rules** together to confirm what the judges expect on the business side.

### Mission, Vision and Value Proposition
* Write a clear **mission statement, vision and value proposition** early.
* These feed directly into the presentation section on what solution the product provides.
* Mission value was highlighted as a strength to emphasize.

### Open Items
* Decide the brand colors and name.
* Draft the mission statement, vision and value proposition.
* Check the hackathon rules for business-side requirements.
* Clarify what "pin info" refers to.

ChatGPT can generate recipes, but our app could combine:
Budget + Nutrition + Cooking Time + Preferences + Grocery List
