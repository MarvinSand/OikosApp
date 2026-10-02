-- Phase 70: Nachzügler, die im Live-Schema fehlten (Sep. 2026)
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Gefunden über die Postgres-Logs ("column ... does not exist") und einen
-- Abgleich aller Spalten-Referenzen im Frontend gegen information_schema:
--   * profiles.theme_preference  – phase44 wurde nie ausgeführt; ThemeContext
--     fragte die Spalte bei JEDEM App-Start ab → 400, Theme-Sync kaputt.
--   * is_username_available()    – phase45 wurde nie ausgeführt; die
--     Registrierung prüfte die Verfügbarkeit deshalb nie.
--   * event_participants.status  – Community-Events speichern Zu-/Absagen
--     ('going' | 'maybe' | 'not_going'), die Spalte gab es nie → RSVP-Buttons
--     schlugen still fehl.
--   * 77 Foreign Keys ohne Index (Supabase Performance Advisor).

-- 1) Theme-Präferenz (entspricht phase44)
alter table public.profiles
  add column if not exists theme_preference text default null;

-- 2) Eindeutige Benutzernamen, case-insensitive (entspricht phase45)
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- 3) RSVP-Status für Community-Events
alter table public.event_participants
  add column if not exists status text not null default 'going';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.event_participants'::regclass
      and conname = 'event_participants_status_check'
  ) then
    alter table public.event_participants
      add constraint event_participants_status_check
      check (status in ('going', 'maybe', 'not_going'));
  end if;
end $$;

-- 4) Index für jeden Foreign Key im public-Schema, der noch keinen hat
--    (führende Index-Spalten = FK-Spalten). Generisch statt Liste, damit auch
--    künftige Nachzügler beim erneuten Ausführen erfasst werden.
do $$
declare
  fk record;
  idx_name text;
  col_list text;
begin
  for fk in
    select c.conrelid, c.conname, c.conkey,
           cls.relname as table_name
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    where c.contype = 'f'
      and n.nspname = 'public'
      and cls.relkind = 'r'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey
      )
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord)
      into col_list
    from unnest(fk.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = fk.conrelid and a.attnum = k.attnum;

    idx_name := left('idx_' || fk.table_name || '_' || replace(replace(col_list, '"', ''), ', ', '_'), 63);
    execute format('create index if not exists %I on public.%I (%s)', idx_name, fk.table_name, col_list);
  end loop;
end $$;
