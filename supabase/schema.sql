-- Rack — Supabase schema (Postgres 15+)
-- Run once in the Supabase SQL editor. Every table is owner-scoped through RLS.

create extension if not exists pgcrypto;

-- ── Wardrobe items ────────────────────────────────────────────────────────
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('top', 'bottom')),
  category    text not null,
  name        varchar(60) not null check (char_length(name) between 1 and 60),
  color       char(7) not null check (color ~ '^#[0-9a-f]{6}$'),
  pattern     text not null check (pattern in ('solid', 'stripes', 'checks', 'floral', 'print', 'graphic')),
  formality   smallint not null check (formality between 1 and 5),
  photo_path  text not null,                       -- object path in the wardrobe-photos bucket
  created_at  timestamptz not null default now(),
  constraint items_category_matches_kind check (
    (kind = 'top'    and category in ('tee', 'tank', 'shirt', 'blouse', 'polo', 'sweater', 'hoodie', 'kurta')) or
    (kind = 'bottom' and category in ('jeans', 'trousers', 'chinos', 'skirt', 'shorts', 'joggers'))
  )
);
create index if not exists items_user_created_idx on public.items (user_id, created_at desc);

-- ── Favourite outfits (top + bottom pair) ─────────────────────────────────
-- The pair *is* the identity, matching the app's lookId(topId, bottomId) = "<top>__<bottom>".
create table if not exists public.favorites (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  top_id      uuid not null references public.items (id) on delete cascade,
  bottom_id   uuid not null references public.items (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, top_id, bottom_id)
);
create index if not exists favorites_top_idx on public.favorites (top_id);
create index if not exists favorites_bottom_idx on public.favorites (bottom_id);

-- ── Wear log ("worn on") — survives item deletion (FR-6, EC-10) ───────────
create table if not exists public.wear_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  top_id      uuid references public.items (id) on delete set null,
  bottom_id   uuid references public.items (id) on delete set null,
  worn_on     date not null default current_date,
  occasion    text not null check (occasion in ('everyday', 'office', 'college', 'date', 'wedding', 'travel')),
  created_at  timestamptz not null default now()
);
create index if not exists wear_log_user_date_idx on public.wear_log (user_id, worn_on desc);
create index if not exists wear_log_top_idx on public.wear_log (top_id);
create index if not exists wear_log_bottom_idx on public.wear_log (bottom_id);

-- ── Per-user settings ─────────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  location_name  text,
  latitude       double precision check (latitude between -90 and 90),
  longitude      double precision check (longitude between -180 and 180),
  updated_at     timestamptz not null default now()
);

-- ── Guard: favourites / wear log must pair a top with a bottom of the same owner ──
create or replace function public.check_outfit_pair() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.top_id is not null and not exists (
       select 1 from public.items where id = new.top_id and kind = 'top' and user_id = new.user_id) then
    raise exception 'top_id must reference one of your tops';
  end if;
  if new.bottom_id is not null and not exists (
       select 1 from public.items where id = new.bottom_id and kind = 'bottom' and user_id = new.user_id) then
    raise exception 'bottom_id must reference one of your bottoms';
  end if;
  return new;
end $$;

drop trigger if exists favorites_pair_check on public.favorites;
create trigger favorites_pair_check before insert or update on public.favorites
  for each row execute function public.check_outfit_pair();

drop trigger if exists wear_log_pair_check on public.wear_log;
create trigger wear_log_pair_check before insert on public.wear_log
  for each row execute function public.check_outfit_pair();

-- ── Row-level security: owner only ────────────────────────────────────────
alter table public.items         enable row level security;
alter table public.favorites     enable row level security;
alter table public.wear_log      enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own wear log" on public.wear_log;
create policy "own wear log" on public.wear_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Storage: private bucket, objects live under "<user_id>/..." ───────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-photos', 'wardrobe-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects for select
  using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects for insert
  with check (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'wardrobe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
