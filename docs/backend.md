# Backend: Supabase + FastAPI

How the local backend fits together, how to run it, and how to add to it.

## Architecture

```
                 login / signup (supabase-js, anon key)
             ┌──────────────────────────────────────────┐
             │                                          ▼
React web app ──/api/*──► FastAPI (apps/api) ──► Kong :54321 ──► auth (GoTrue)
 (Vite :5173)   Bearer     verifies the JWT,        │
                <user JWT> forwards it              └──────────► rest (PostgREST) ──► Postgres :54322
                              │                                    RLS: auth.uid() = user_id
                              ├──► Qdrant :6333 (recipe vectors)
                              └──► AWS Bedrock agent (not wired yet)
```

- **Supabase is the CRUD backend.** Postgres holds the app tables, GoTrue handles accounts, and PostgREST exposes the tables over HTTP.
- **FastAPI is the proxy and the agentic server.** The web app sends all data requests to FastAPI. FastAPI never queries Supabase as itself for user data. It forwards the user's own token, so Postgres row level security (RLS) decides what that user can see.
- **The web app only talks to Supabase for login.** It uses `supabase-js` with the anon key to sign up and sign in, then sends the access token to FastAPI as `Authorization: Bearer <token>`.

## Quick start

Prerequisites: Docker Desktop, [uv](https://docs.astral.sh/uv/), pnpm, and Python 3.14 (uv installs it if missing).

```powershell
# 1. One-time: generate your own secrets into .env (git-ignored)
python scripts/gen-env.py

# 2. Start Supabase + Qdrant
docker compose up -d --wait

# 3. Start the API (http://localhost:8000, docs at /docs)
pnpm dev:api

# or the web app and API together
pnpm dev
```

On first start, the database applies [supabase/schema.sql](../supabase/schema.sql) automatically.

Stop the stack with `docker compose down`. Add `-v` to also wipe all local data, including users.

## Services

| Service | URL | What it is |
|---|---|---|
| FastAPI | http://localhost:8000 | Our API. The Vite dev server proxies `/api` here. |
| Supabase API (Kong) | http://localhost:54321 | Gateway: `/auth/v1` → GoTrue, `/rest/v1` → PostgREST |
| Postgres | `postgresql://postgres:postgres@localhost:54322/postgres` | Direct DB access (psql, DBeaver) |
| Studio | http://localhost:54323 | Supabase dashboard: browse tables, users, run SQL |
| Qdrant | http://localhost:6333/dashboard | Vector DB for recipes |

All ports bind to `127.0.0.1` only. The credentials are throwaway local-dev values, so don't deploy this compose file.

## Secrets (`.env`)

`scripts/gen-env.py` writes three values to `.env` at the repo root:

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_JWT_SECRET` | GoTrue, PostgREST, FastAPI | Signs and verifies every token. Never expose it. |
| `SUPABASE_ANON_KEY` | Web app, FastAPI | Public. Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | FastAPI only | **Bypasses RLS.** Server side only. |

Each developer generates their own. To rotate them, delete `.env`, run the script again, then run `docker compose up -d --force-recreate`. Existing logins become invalid.

FastAPI reads `.env` through [settings.py](../apps/api/src/api/settings.py). `SUPABASE_URL` defaults to `http://localhost:54321`.

## Authentication flow

1. The user signs up or signs in from the web app through GoTrue. Accounts are confirmed automatically in local dev, so no email is sent.
2. GoTrue returns an **access token**: a JWT signed with `SUPABASE_JWT_SECRET`, with `sub` = user id and `aud` = `authenticated`.
3. The web app calls FastAPI with `Authorization: Bearer <access token>`.
4. FastAPI's `CurrentUser` dependency ([auth.py](../apps/api/src/api/auth.py)) checks the signature, expiry and audience. Missing or invalid tokens get `401`. The anon and service keys are rejected too, because they aren't user tokens.
5. A route that uses `UserDB` sends that same token to PostgREST. Postgres sees the request as that user (`auth.uid()`) and applies RLS.

When a user registers, a trigger creates their `profiles` row automatically.

## Writing API routes

[db.py](../apps/api/src/api/db.py) provides two Supabase clients as FastAPI dependencies:

| Dependency | Acts as | Use for |
|---|---|---|
| `UserDB` | The logged-in user (RLS enforced) | **Everything a user triggers.** This is the default. |
| `ServiceDB` | `service_role` (RLS bypassed) | System work only: seeding, background agent jobs, admin actions. |
| `CurrentUser` | n/a | The verified user: `.id`, `.email`, `.token` |

```python
from api.auth import CurrentUser
from api.db import UserDB


@app.get("/api/preferences")
async def get_preferences(db: UserDB):
    # No user_id filter needed: RLS only returns this user's row.
    res = await db.table("preferences").select("*").maybe_single().execute()
    return res.data if res else None


@app.put("/api/preferences")
async def put_preferences(body: PreferencesIn, user: CurrentUser, db: UserDB):
    # Inserts must still set user_id; RLS rejects any other value.
    row = body.model_dump() | {"user_id": user.id}
    res = await db.table("preferences").upsert(row).execute()
    return res.data[0]
```

Rules of thumb:

- **Never use `ServiceDB` for a user request.** It returns every user's rows. If you think you need it, filter by `user.id` yourself and leave a comment explaining why.
- **Always set `user_id = user.id` on inserts.** RLS blocks other values with error `42501`.
- PostgREST errors come back as `postgrest.exceptions.APIError`, with Postgres or PostgREST codes such as `42501` (permission), `23505` (unique) and `23514` (check constraint). Map them to proper HTTP responses rather than letting them become 500s.

## Database schema

All app tables live in [supabase/schema.sql](../supabase/schema.sql). Recipes themselves live in Qdrant and are referenced by `recipe_id` (text).

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user, created automatically on sign-up |
| `allergies` | Household allergens. **Add-only**: users can't update or delete them. |
| `preferences` | Diet styles, likes/dislikes, household size, budget, plan length (one row per user) |
| `nutrition_goals` | Daily macro targets plus optional body stats for the calculator (one row per user) |
| `meal_option_sessions` | One generation run, with snapshots of the allergies, preferences and goals it used |
| `meal_options` | Candidate recipes produced by a session, with compliance results and status |
| `meal_plans` | A saved plan, optionally linked to the session it came from |
| `meal_plan_slots` | One meal in a plan (day + meal type). Stores a copy of the recipe. |
| `favorites`, `feedback` | Hearts and like/dislike per recipe |
| `recipe_popularity` (view) | Aggregate favorite counts. Exposes no individual's data. |

Safety rules enforced by the database itself, not just by app code:

- **RLS on every table.** Users can only read and write rows where `user_id = auth.uid()`.
- **Child rows must belong to the same user as their parent.** For example, a slot can only point at the user's own plan. This uses composite foreign keys on `(id, user_id)`.
- **Allergies are add-only.** There are no update or delete policies, and those privileges are revoked.
- **No unsafe meal options.** A `meal_options` row with `allergen_safe = false` can't be inserted.
- **Nutrition targets must be consistent.** Calories must be ≥ 1200, and macro calories (4/4/9 per gram) must be within 10% of the calorie target.
- **One accepted meal per slot.** Rejected and replaced slots stay as history, so you can add a replacement without deleting the old row.
- **Deleting a user deletes all their data.** Everything cascades from `auth.users`.

### Changing the schema

`schema.sql` runs automatically **only when the database is empty** (first start, or after `docker compose down -v`). It isn't idempotent, so don't re-run the whole file against a database that already has the tables.

- **Throwaway local data:** edit `schema.sql`, then `docker compose down -v` and `docker compose up -d --wait`.
- **Keep local data:** edit `schema.sql`, and also apply the change by hand, for example:
  ```powershell
  Get-Content change.sql -Raw | docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 --single-transaction
  ```

Tell your teammates when you change the schema so they can reset or apply it too. If changes become frequent, move to numbered files in `supabase/migrations/`.

New tables need `alter table … enable row level security` plus policies. Without RLS, any logged-in user can read every row.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `required variable SUPABASE_JWT_SECRET is missing a value` | No `.env` yet. Run `python scripts/gen-env.py`. |
| `auth` or `rest` stuck in `Created` | The DB wasn't healthy in time. Run `docker compose up -d --wait`. |
| FastAPI returns `401` | Missing, expired or non-user token. Sign in again in the web app. |
| PostgREST `42501` | RLS blocked it: wrong `user_id`, a forbidden operation (such as deleting an allergy), or `ServiceDB` vs `UserDB` mixed up. |
| PostgREST `PGRST205` "Could not find the table" | Table doesn't exist, or PostgREST hasn't reloaded its schema cache. Run `docker compose exec db psql -U postgres -c "notify pgrst, 'reload schema'"`. |
| Schema change not showing up | Init scripts only run on an empty volume. See [Changing the schema](#changing-the-schema). |
| `uv` warns `VIRTUAL_ENV ... does not match` | A different env (such as conda) is active. Harmless: uv uses the repo's `.venv`. |

## Mock stores and the shopping agent

The shopping agent takes a grocery list, compares prices across six mock stores, saves products to a cart and pays for the basket with one payment. Payment runs in Stripe's sandbox only, so no real card is ever charged.

```
shopping agent (apps/api) ──HTTP──► storefront (apps/storefront, :8100) ──► seed/*.csv, stores.yaml
   │    │                                   │
   │    └──► cart (in memory for now)       └──► Stripe sandbox (PaymentIntent)
   │
   └──MCP──► Link CLI (npx @stripe/link-cli) ──► your approval in the Link app
```

### Storefront (`apps/storefront`)

A separate FastAPI app that serves six stores from the seed files in `apps/storefront/seed/`. The agent only reaches it over HTTP.

```powershell
pnpm dev:storefront     # http://localhost:8100, also started by `pnpm dev`
```

| For | Routes |
|---|---|
| People | `/`, `/stores/{slug}`, `/stores/{slug}/search?q=`, `/stores/{slug}/products/{upc}` |
| Agents (JSON) | `/api/stores`, `/api/stores/{slug}`, `/api/stores/{slug}/products?q=`, `/api/stores/{slug}/products/{upc}` |
| Feeds | `/stores/{slug}/feed.json`, plus schema.org `Product` data on every product page |
| Checkout | `POST /api/checkout` (one payment for baskets at one or more stores) |

- Products are identified by 12-digit UPC-A codes, stored as text, in the company-internal range (starting with 4). Check digits are validated when the app starts, and a bad row stops it from starting.
- A national-brand product has the same UPC at every store. A store-brand product has its own UPC and is matched to others by `equivalence_group`, as "comparable" rather than identical.
- Prices are fixed and in whole cents. To change the catalog, edit the files in `apps/storefront/seed/`.

### Checkout

One checkout takes payment for baskets at several stores at once, with the Machine Payments Protocol. The buyer sends the products and quantities per store; each store prices its own basket.

```
POST /api/checkout
  {"orders": [{"store": "walmart", "lines": [{"upc": "410020000223", "quantity": 2}]},
              {"store": "target",  "lines": [{"upc": "410020000223", "quantity": 1}]}]}
  → 402  WWW-Authenticate: Payment ... method="stripe" ...   (body has every store's quote and one total)
POST again with the payment credential
  → 200  one order per store, all on the same payment, with a Payment-Receipt header
```

- **One payment, one approval.** The total of every store's basket is charged once. Each store still gets its own order number.
- Each store applies its own stock, order minimum and delivery fee. If any store can't sell its part, the checkout answers 409 and names every such store with the reason, so the buyer can leave those out and try again. Nothing is charged.
- Card payments need a combined total of at least $0.50.
- The challenge is bound to the request body, so a payment approved for one set of baskets can't pay for another.
- All six stores charge the same Stripe sandbox account. The stores keep no record of orders; the payment shows in the Stripe sandbox dashboard.
- Without the two Stripe settings below, checkout still validates a basket but answers 503.
- **Only sandbox keys are accepted.** The app refuses to start with a live key or a non-test profile ID.

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | Sandbox secret key (`sk_test_...`) |
| `STRIPE_PROFILE_ID` | Sandbox Stripe profile ID (`profile_test_...`). Look it up with `curl https://api.stripe.com/v2/network/business_profiles/me -u sk_test_...: -H "Stripe-Version: 2026-07-29.preview"` |

### Agent (`apps/api/src/api`)

| Module | What it does |
|---|---|
| `shopping/` | Storefront client, price index built from the store feeds, unit conversion, `compare_prices` and `plan_basket`. All plain code. |
| `cart/` | Cart items and the manual/auto rules. |
| `wallet/` | Pays a store's checkout through Stripe's Link CLI, over its MCP server. |
| `agent/` | The tool loop, the tools, and the model providers. |

- **Tools:** `list_stores`, `search_products`, `compare_prices`, `plan_basket`, `add_to_cart`, `remove_from_cart`, `view_cart`, and `checkout` when a wallet is connected.
- **The server sets the price and pack count.** The model only names a store, a UPC and the ingredient it is for.
- **Manual mode:** everything is saved as `proposed` until the user approves the basket.
- **Auto mode:** items go straight to `in_cart`, except these, which stay `proposed` for the user's check: store-brand items, replacements for something out of stock, unsure matches, more than 10 packs of one item, and anything that would pass the weekly budget. Auto with no budget runs as manual.
- **The mode is enforced in `cart/service.py`,** not in the prompt. The agent has one `add_to_cart` tool in both modes.
- **The agent pays in both modes.** At the end of a run it calls `checkout` once, which pays for everything in the cart, proposed or not, with a single payment. Your approval in the Link app is the check on it. Paid items leave the cart and the run's summary lists one order per store.

- **A model that stops early is reminded.** If the model says it is done with a planned basket but an empty cart, or with an unpaid cart when paying is on, the code tells it what is missing and lets it continue, at most twice. After that the run ends as `stopped_early`. It is never reminded to pay after a payment was tried, so a declined payment doesn't send a second request.
- **Trust the run's summary, not the model's message.** The summary in the `done` event is computed in code from the cart and the orders.

### Paying (`wallet/`)

The model only says "check out". Everything else about a payment is decided in code:

1. The agent asks the checkout for every store's quote. A store that can't sell its part is left out, its items stay in the cart, and the rest goes ahead.
2. It compares each store's quote with the cart. If any differ, nothing is paid.
3. It calls Link's `mpp_pay` command through the MCP server, always with test mode on.
4. Link asks you to approve once in the Link app. The run streams an `approval_needed` event with the total, the stores and the approval link, and checks every few seconds for up to 10 minutes.
5. Once approved, Link pays with a one-time token. No card number reaches this code or the model.

Setup, once per machine: Node, then `npx @stripe/link-cli auth login`. The Link account must be a US consumer account, and Link limits spending to $500 per request and per day, which now applies to the whole basket.

The agent starts the Link CLI itself as a child process (`npx @stripe/link-cli --mcp`). Don't use `link-cli serve`: it listens on port 54321, which is the Supabase gateway.

Settings (all optional, in `.env`):

| Variable | Default | Notes |
|---|---|---|
| `STOREFRONT_URL` | `http://localhost:8100` | Where the agent finds the stores |
| `LLM_PROVIDER` | `scripted` | `scripted` runs offline with no model. `bedrock` uses the Converse API. |
| `BEDROCK_MODEL_ID` | none | Required for `bedrock`. There is no default model. |
| `AWS_REGION` | none | Region for Bedrock |
| `AWS_BEARER_TOKEN_BEDROCK` | none | A Bedrock API key. Optional: without it the usual AWS credentials are used. |
| `AGENT_MAX_STEPS` | `25` | Model turns per run |
| `AGENT_TOOL_TIMEOUT_SECONDS` | `10` | Per tool call, except `checkout` |
| `PAYMENTS_ENABLED` | `true` | `false` stops every run at the saved cart |
| `LINK_MCP_COMMAND` | `npx -y @stripe/link-cli@0.27.0 --mcp` | The version is pinned on purpose |
| `LINK_APPROVAL_TIMEOUT_SECONDS` | `600` | How long to wait for your approval |

Try it from the command line, with the storefront running. The cart is kept in memory and discarded when the command exits. Add `--no-pay` to stop at the saved cart:

```powershell
uv run --package api python -m api.agent apps/api/tests/sample_list.json --mode auto --budget 150
```

Tests:

```powershell
uv run --package api pytest apps/api
uv run --package storefront pytest apps/storefront
```

What has and hasn't run for real:

- The Bedrock provider has run for real (2026-10-10) with payments off, on the same 14-item list:

  | Model | Result |
  |---|---|
  | `nvidia.nemotron-super-3-120b` | Correct basket in two of two runs, about 25 s each. This is the model set in `.env`. |
  | `nvidia.nemotron-nano-3-30b` | Correct basket in one run, 28 s. |
  | `nvidia.nemotron-nano-9b-v2` | One run claimed success with an empty cart; a second run was correct but took 125 s. |

- A real model has paid end to end (2026-10-10): `nvidia.nemotron-super-3-120b` searched, planned, saved and paid a three-store basket through Link with one approval and one $47.60 sandbox payment.
- Payment is tested against a fake Stripe and a fake Link server in the test suite.
- The full flow has run for real in the Stripe sandbox (2026-10-10): the scripted agent paid for a three-store basket through Link with one approval and one $47.60 payment. Add `--pretty` to the command above for short readable output.
- With the Stripe keys in `.env`, this makes one real sandbox payment without Link:

```powershell
$env:RUN_STRIPE_SANDBOX_TEST = "1"; uv run --package storefront pytest apps/storefront -k sandbox
```

## Not built yet

- **Cart and agent routes.** The cart has no Supabase table and neither the cart nor the agent has an HTTP route. Both need the login code below to load first.
- **The API's login code does not load.** `auth.py` and `db.py` import `supabase` and `jwt`, which are not declared in `apps/api/pyproject.toml`, and `main.py` does not create the shared HTTP client that `db.py` expects.
- **CRUD endpoints** for the tables above. Only `/api/health` exists today.
