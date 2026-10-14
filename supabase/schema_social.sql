-- Garage Life: perfiles (username), amigos y garajes visitables.
-- Pégalo en Supabase -> SQL Editor -> Run (despues de schema.sql). Es seguro ejecutarlo mas de una vez.

-- 1) Perfil publico: username unico (sin distinguir mayusculas)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  level      int  not null default 1,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_auth" on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_select_auth" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own"  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 2) Amistades: el que invita crea 'pending'; el invitado la acepta; cualquiera de los dos puede borrarla
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references auth.users(id) on delete cascade,
  addressee  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;
drop policy if exists "fr_select" on public.friendships;
drop policy if exists "fr_insert" on public.friendships;
drop policy if exists "fr_update" on public.friendships;
drop policy if exists "fr_delete" on public.friendships;
create policy "fr_select" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "fr_insert" on public.friendships for insert to authenticated with check (auth.uid() = requester and status = 'pending');
create policy "fr_update" on public.friendships for update to authenticated using (auth.uid() = addressee) with check (auth.uid() = addressee and status = 'accepted');
create policy "fr_delete" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.friendships f
    where f.status = 'accepted' and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;

-- 3) Garaje visible: copia reducida de la partida (autos, zonas, accesorios, acabados). Sin dinero ni datos privados.
create table if not exists public.garages (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.garages enable row level security;
drop policy if exists "garages_select" on public.garages;
drop policy if exists "garages_insert" on public.garages;
drop policy if exists "garages_update" on public.garages;
drop policy if exists "garages_delete" on public.garages;
create policy "garages_select" on public.garages for select to authenticated using (auth.uid() = user_id or public.are_friends(auth.uid(), user_id));
create policy "garages_insert" on public.garages for insert to authenticated with check (auth.uid() = user_id);
create policy "garages_update" on public.garages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "garages_delete" on public.garages for delete to authenticated using (auth.uid() = user_id);
