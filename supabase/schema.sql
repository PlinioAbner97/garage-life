-- Garage Life: tabla de partidas guardadas (una fila por jugador).
-- Pégalo en Supabase -> SQL Editor -> Run.
create table if not exists public.saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Cada jugador solo puede leer y escribir SU propia partida.
create policy "saves_select_own" on public.saves for select using (auth.uid() = user_id);
create policy "saves_insert_own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves_update_own" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saves_delete_own" on public.saves for delete using (auth.uid() = user_id);
