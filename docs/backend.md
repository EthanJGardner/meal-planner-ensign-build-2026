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

## Not built yet

- **AWS Bedrock agent.** The plan is to invoke it from FastAPI with action groups set to *return control*. FastAPI would then run each tool call itself using `UserDB`, so the agent can only reach the current user's data.
- **CRUD endpoints** for the tables above. Only `/api/health` and `/api/me` exist today.
