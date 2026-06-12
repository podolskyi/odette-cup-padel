-- Community-contributed data for the live app.
--
-- Visibility model: anyone loading the app reads these; the "Add tournament"
-- flow is gated only by a client-side secret word, so writes are open to the
-- anon role (acceptable for a small private community app). Tighten later by
-- routing writes through an edge function with a server-side secret.

-- One row per imported tournament. `id` is the americano-padel.com /r/<uuid>,
-- so re-importing the same link upserts instead of duplicating.
create table if not exists public.community_tournaments (
  id          text primary key,
  data        jsonb not null,          -- a full Tournament object
  created_at  timestamptz not null default now()
);

-- A single shared row holding the live alias map (variant name -> canonical).
create table if not exists public.community_aliases (
  id          text primary key default 'live',
  map         jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.community_tournaments enable row level security;
alter table public.community_aliases     enable row level security;

-- Open read + write for anon (client-side-secret model).
create policy "community_tournaments read"  on public.community_tournaments for select using (true);
create policy "community_tournaments write" on public.community_tournaments for insert with check (true);
create policy "community_tournaments update" on public.community_tournaments for update using (true) with check (true);

create policy "community_aliases read"   on public.community_aliases for select using (true);
create policy "community_aliases write"  on public.community_aliases for insert with check (true);
create policy "community_aliases update" on public.community_aliases for update using (true) with check (true);
