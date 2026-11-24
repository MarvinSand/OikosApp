-- phase106: Einzeltermine mit eigenem Beginn UND Ende.
-- recurrence_dates (timestamptz[]) → jsonb: [{"start": iso, "end": iso|null}, …]
-- Bestehende Termine behalten ihre bisherige Dauer (ends_at − starts_at). Idempotent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'world_map_activities'
      and column_name = 'recurrence_dates' and udt_name = '_timestamptz'
  ) then
    alter table public.world_map_activities add column if not exists recurrence_slots jsonb;
    update public.world_map_activities a
       set recurrence_slots = (
         select jsonb_agg(jsonb_build_object(
                  'start', d,
                  'end', case when a.starts_at is not null and a.ends_at is not null
                              then d + (a.ends_at - a.starts_at) end)
                order by d)
         from unnest(a.recurrence_dates) d)
     where a.recurrence_dates is not null;
    alter table public.world_map_activities drop column recurrence_dates;
    alter table public.world_map_activities rename column recurrence_slots to recurrence_dates;
  end if;
end $$;

comment on column public.world_map_activities.recurrence_dates is
  'Nur bei recurrence_freq = custom: weitere Termine als [{start, end}] (zusätzlich zu starts_at/ends_at)';
