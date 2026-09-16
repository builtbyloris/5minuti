create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  game_state jsonb not null,
  schema_version integer not null check (schema_version > 0),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon, authenticated;
grant select, insert, update on table public.game_saves to authenticated;

create or replace function public.set_game_saves_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_game_saves_updated_at() from public;

drop trigger if exists set_game_saves_updated_at on public.game_saves;
create trigger set_game_saves_updated_at
before update on public.game_saves
for each row execute function public.set_game_saves_updated_at();

create policy "game_saves_select_own"
on public.game_saves for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "game_saves_insert_own"
on public.game_saves for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "game_saves_update_own"
on public.game_saves for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
