-- =====================================================================
-- AI Meal Planner: Supabase schema
-- Runs automatically on a fresh local database (mounted into the db
-- container's init scripts by docker-compose.yaml). Not idempotent.
-- To apply to an existing database once (PowerShell):
--   Get-Content supabase/schema.sql -Raw | docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 --single-transaction
-- Accounts (register/login) are handled by Supabase Auth (auth.users).
-- Recipes live in the vector DB and are referenced by recipe_id (text).
-- =====================================================================

-- ---------- Helpers ---------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 1. Profiles (endpoints #1-4) ------------------------------
-- One row per Supabase Auth user. Deleting the auth user cascades to
-- every table below (DELETE /users/me).

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when someone registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who registered before this schema existed.
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- ---------- 2. Allergies (endpoints #5-6): STRICT, ADD-ONLY -----------
-- No update or delete policy exists, and update/delete are revoked from
-- the client roles. Rows only disappear when the account is deleted.

create table public.allergies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  allergen   text not null,
  notes      text,
  created_at timestamptz not null default now(),
  constraint allergen_is_normalized check (allergen = lower(btrim(allergen)) and length(allergen) > 0),
  unique (user_id, allergen)
);

create index allergies_user_idx on public.allergies (user_id);

-- ---------- 3. Preferences (endpoints #7-9): FLEXIBLE -----------------

create table public.preferences (
  user_id               uuid primary key references public.profiles (id) on delete cascade,
  diet_styles           text[] not null default '{}',   -- e.g. vegetarian, low-carb
  liked_foods           text[] not null default '{}',
  disliked_foods        text[] not null default '{}',
  liked_cuisines        text[] not null default '{}',
  disliked_cuisines     text[] not null default '{}',
  household_size        int    not null default 1 check (household_size between 1 and 20),
  weekly_budget         numeric(10, 2) check (weekly_budget is null or weekly_budget >= 0),
  max_cook_time_minutes int    check (max_cook_time_minutes is null or max_cook_time_minutes > 0),
  plan_days             int    not null default 7 check (plan_days between 1 and 31),
  -- capped by the four meal_plan_slots.meal_type values
  meals_per_day         int    not null default 3 check (meals_per_day between 1 and 4),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger preferences_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- ---------- 4. Nutrition goals (endpoints #10-14) ---------------------
-- Body stats are optional and only used by POST .../calculate.
-- The check constraints are the same rules as POST .../check, so an
-- inconsistent or unsafe target can never be saved.

create table public.nutrition_goals (
  user_id        uuid primary key references public.profiles (id) on delete cascade,

  -- targets (per day)
  calories       int not null check (calories >= 1200),
  protein_g      int not null check (protein_g >= 0),
  carbs_g        int not null check (carbs_g >= 0),
  fat_g          int not null check (fat_g >= 0),
  fiber_g        int check (fiber_g is null or fiber_g >= 0),
  sodium_mg_max  int check (sodium_mg_max is null or sodium_mg_max > 0),

  -- optional inputs for the calculator
  age            int check (age is null or age between 1 and 120),
  sex            text check (sex is null or sex in ('female', 'male', 'other')),
  height_cm      numeric(5, 1) check (height_cm is null or height_cm > 0),
  weight_kg      numeric(5, 1) check (weight_kg is null or weight_kg > 0),
  activity_level text check (activity_level is null or activity_level in
                   ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal           text check (goal is null or goal in ('lose', 'maintain', 'gain')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- macro calories (4/4/9) must land within 10% of the calorie target
  constraint macros_match_calories check (
    abs((protein_g * 4 + carbs_g * 4 + fat_g * 9) - calories) <= calories * 0.10
  )
);

create trigger nutrition_goals_updated_at
  before update on public.nutrition_goals
  for each row execute function public.set_updated_at();

-- ---------- 5. Meal option sessions (endpoints #15-20) ----------------
-- Snapshots freeze what the pipeline used, so reloading a session
-- (GET /meal-options/{session_id}) is stable even if the user later
-- edits preferences.

create table public.meal_option_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  status                text not null default 'pending'
                        check (status in ('pending', 'ready', 'failed')),
  allergies_snapshot    text[] not null default '{}',
  preferences_snapshot  jsonb  not null default '{}',
  nutrition_snapshot    jsonb  not null default '{}',
  overrides             jsonb  not null default '{}',  -- preferences/macros only, never allergies
  relaxed_constraints   text[] not null default '{}',  -- which soft prefs were relaxed to reach 7+
  error_message         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id)  -- target for child composite FKs
);

create index meal_option_sessions_user_idx
  on public.meal_option_sessions (user_id, created_at desc);

create trigger meal_option_sessions_updated_at
  before update on public.meal_option_sessions
  for each row execute function public.set_updated_at();

create table public.meal_options (
  id                     uuid primary key default gen_random_uuid(),
  session_id             uuid not null,
  user_id                uuid not null references public.profiles (id) on delete cascade,

  recipe_id              text not null,                 -- id in the vector DB
  title                  text not null,
  image_url              text,
  source_name            text,
  source_url             text,
  cook_time_minutes      int,
  servings               int,
  nutrition              jsonb not null default '{}',   -- per serving: calories, protein_g, carbs_g, fat_g...

  -- compliance results from the code filter + LLM check
  allergen_safe          boolean not null,
  compliance             jsonb not null default '{}',   -- per-constraint pass/fail + reason
  preference_match_score numeric(5, 2),                 -- how well soft preferences matched
  preferences_matched    int,
  preferences_total      int,
  macro_status           text check (macro_status is null or macro_status in ('under', 'on_target', 'over')),

  rank                   int not null,
  is_headline            boolean not null default false,

  -- queued = validated but not yet shown (feeds /more and /replace)
  status                 text not null default 'queued'
                         check (status in ('queued', 'shown', 'selected', 'accepted', 'rejected', 'replaced')),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Safety net: an option that failed the allergen check can never be stored.
  constraint option_must_be_allergen_safe check (allergen_safe = true),
  unique (session_id, recipe_id),

  -- FK checks bypass RLS, so tie the parent to the same owner explicitly.
  foreign key (session_id, user_id)
    references public.meal_option_sessions (id, user_id) on delete cascade
);

create index meal_options_session_idx on public.meal_options (session_id, status, rank);
create index meal_options_user_idx on public.meal_options (user_id);

create trigger meal_options_updated_at
  before update on public.meal_options
  for each row execute function public.set_updated_at();

-- ---------- 6. Meal plans (endpoints #22-28) --------------------------

create table public.meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  session_id uuid,
  name       text not null default 'My meal plan',
  start_date date,
  num_days   int not null default 7 check (num_days between 1 and 31),
  status     text not null default 'draft' check (status in ('draft', 'saved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),  -- target for meal_plan_slots composite FK

  -- Same owner as the session; deleting the session clears only session_id.
  foreign key (session_id, user_id)
    references public.meal_option_sessions (id, user_id) on delete set null (session_id)
);

create index meal_plans_user_idx on public.meal_plans (user_id, created_at desc);

create trigger meal_plans_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();

-- Slots snapshot the recipe so saved plans survive vector DB re-ingestion,
-- and so the grocery list (#29) and summary (#30) can be computed from here.
create table public.meal_plan_slots (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null,
  user_id           uuid not null references public.profiles (id) on delete cascade,

  day_index         int  not null check (day_index >= 0),       -- 0 = first day of the plan
  meal_type         text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),

  recipe_id         text not null,
  title             text not null,
  image_url         text,
  source_url        text,
  cook_time_minutes int,
  servings          int,
  ingredients       jsonb not null default '[]',   -- [{name, quantity, unit, est_cost}]
  nutrition         jsonb not null default '{}',   -- per serving
  estimated_cost    numeric(10, 2),

  status            text not null default 'accepted'
                    check (status in ('accepted', 'rejected', 'replaced')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  foreign key (plan_id, user_id)
    references public.meal_plans (id, user_id) on delete cascade
);

create index meal_plan_slots_plan_idx on public.meal_plan_slots (plan_id);

-- One accepted meal per slot. Rejected/replaced rows stay as history, so a
-- replacement can be inserted alongside the row it replaces.
create unique index meal_plan_slots_one_accepted
  on public.meal_plan_slots (plan_id, day_index, meal_type)
  where status = 'accepted';

create trigger meal_plan_slots_updated_at
  before update on public.meal_plan_slots
  for each row execute function public.set_updated_at();

-- ---------- 7. Favorites and feedback (endpoints #31-34) --------------

create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  recipe_id  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index favorites_recipe_idx on public.favorites (recipe_id);

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  recipe_id  text not null,
  rating     text not null check (rating in ('like', 'dislike')),
  reason     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create trigger feedback_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();

-- GET /recipes/popular: aggregate-only view, so no one's individual
-- favorites are exposed. (Runs as owner, bypassing per-user RLS.)
create view public.recipe_popularity as
  select
    recipe_id,
    count(*) as favorite_count
  from public.favorites
  group by recipe_id;

revoke all on public.recipe_popularity from anon;
grant select on public.recipe_popularity to authenticated;

-- ---------- 8. Row Level Security -------------------------------------
-- Every table is locked to the owning user. Note: if FastAPI connects with
-- the service-role key, RLS is bypassed, so also filter by user_id in code.
-- To have RLS enforced, forward the user's JWT to Supabase instead.

alter table public.profiles             enable row level security;
alter table public.allergies            enable row level security;
alter table public.preferences          enable row level security;
alter table public.nutrition_goals      enable row level security;
alter table public.meal_option_sessions enable row level security;
alter table public.meal_options         enable row level security;
alter table public.meal_plans           enable row level security;
alter table public.meal_plan_slots      enable row level security;
alter table public.favorites            enable row level security;
alter table public.feedback             enable row level security;

-- profiles
create policy "profiles: read own"   on public.profiles for select using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles for update using ((select auth.uid()) = id);

-- allergies: SELECT and INSERT only. No update or delete policy = strict.
create policy "allergies: read own"   on public.allergies for select using ((select auth.uid()) = user_id);
create policy "allergies: insert own" on public.allergies for insert with check ((select auth.uid()) = user_id);
revoke update, delete on public.allergies from anon, authenticated;

-- full-access-to-own-rows policies for everything else
create policy "preferences: own" on public.preferences
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "nutrition_goals: own" on public.nutrition_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "meal_option_sessions: own" on public.meal_option_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "meal_options: own" on public.meal_options
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "meal_plans: own" on public.meal_plans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "meal_plan_slots: own" on public.meal_plan_slots
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "favorites: own" on public.favorites
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "feedback: own" on public.feedback
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
