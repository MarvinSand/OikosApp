-- ============================================================
-- Phase 38: Flexiblere Gebetsziel-Typen + Verknüpfung mit Anliegen
-- - goal_type erweitern um 'days' (Tage in Folge / aktive Tage)
-- - optionale Verknüpfung eines Ziels mit einem (persönlichen) Anliegen
-- - contribute_to_prayer_goal: 'days'-Fortschritt = Anzahl distinct Tage
-- Idempotent – kann mehrfach ausgeführt werden.
-- ============================================================

-- ─── goal_type-Check erweitern ────────────────────────────────
alter table public.prayer_goals
  drop constraint if exists prayer_goals_goal_type_check;

alter table public.prayer_goals
  add constraint prayer_goals_goal_type_check
  check (goal_type in ('hours', 'people', 'days'));

-- ─── Optionale Verknüpfung Ziel ↔ Anliegen ────────────────────
alter table public.prayer_goals
  add column if not exists prayer_request_id uuid
    references public.prayer_requests(id) on delete set null;

alter table public.prayer_goals
  add column if not exists personal_prayer_request_id uuid
    references public.personal_prayer_requests(id) on delete set null;

-- ─── RPC erweitern: 'days'-Fortschritt = Anzahl distinct Tage ──
create or replace function public.contribute_to_prayer_goal(p_goal_id uuid, p_minutes integer default 0)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_type text;
  v_uid uuid := auth.uid();
  v_already boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select goal_type into v_type from public.prayer_goals where id = p_goal_id;
  if v_type is null then raise exception 'goal not found'; end if;

  if v_type = 'people' then
    select exists (
      select 1 from public.prayer_goal_contributions
      where goal_id = p_goal_id and user_id = v_uid
    ) into v_already;
    if not v_already then
      insert into public.prayer_goal_contributions (goal_id, user_id, minutes)
      values (p_goal_id, v_uid, 0);
    end if;
  else
    -- hours und days: eine Contribution pro Session
    insert into public.prayer_goal_contributions (goal_id, user_id, minutes)
    values (p_goal_id, v_uid, greatest(0, coalesce(p_minutes, 0)));
  end if;

  update public.prayer_goals g set
    participant_count = (select count(distinct user_id) from public.prayer_goal_contributions where goal_id = p_goal_id),
    current_value = case
      when g.goal_type = 'people'
        then (select count(distinct user_id) from public.prayer_goal_contributions where goal_id = p_goal_id)
      when g.goal_type = 'days'
        then (select count(distinct (created_at at time zone 'UTC')::date) from public.prayer_goal_contributions where goal_id = p_goal_id)
      else round((select coalesce(sum(minutes), 0) from public.prayer_goal_contributions where goal_id = p_goal_id) / 60.0, 1)
    end,
    updated_at = now()
  where g.id = p_goal_id;
end;
$$;

grant execute on function public.contribute_to_prayer_goal(uuid, integer) to authenticated;
