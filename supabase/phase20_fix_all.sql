-- ============================================================
-- Phase 20: Alle fehlenden Spalten und RPCs auf einmal
-- Einfach EINMAL im Supabase SQL Editor ausführen.
-- Ist vollständig idempotent (kann mehrfach ausgeführt werden).
-- ============================================================

-- ── 1. Fehlende Profil-Spalten ────────────────────────────────
alter table public.profiles
  add column if not exists last_active_at timestamptz,
  add column if not exists show_last_active boolean default true,
  add column if not exists address_full text,
  add column if not exists address_street text,
  add column if not exists address_district text,
  add column if not exists location_precision text default 'city';

-- location_precision constraint (nur hinzufügen wenn noch nicht vorhanden)
do $$ begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_location_precision_check'
  ) then
    alter table public.profiles
      add constraint profiles_location_precision_check
      check (location_precision in ('exact', 'district', 'city'));
  end if;
end $$;

-- ── 2. Aktivitäts-Chat: conversations.activity_id ─────────────
alter table public.conversations
  add column if not exists activity_id uuid references public.world_map_activities(id) on delete cascade;

-- ── 3. Aktivitäts-Chat: world_map_activities.conversation_id ──
alter table public.world_map_activities
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

-- ── 4. Fix activity_participants RLS ──────────────────────────
-- Entferne die fehlerhafte "for all" Policy (kein WITH CHECK → INSERT schlägt fehl)
drop policy if exists "Auth manage participation" on public.activity_participants;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'activity_participants' and policyname = 'Participants: insert own') then
    create policy "Participants: insert own"
      on public.activity_participants for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'activity_participants' and policyname = 'Participants: delete own') then
    create policy "Participants: delete own"
      on public.activity_participants for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ── 5. RLS: Aktivitäts-Conversations lesbar für Mitglieder ────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'conversations'
      and policyname = 'Activity conversations readable by members'
  ) then
    create policy "Activity conversations readable by members"
      on public.conversations for select
      using (
        type = 'activity'
        and auth.uid() is not null
        and exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = conversations.id
            and cm.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ── 6. RPC: join_activity ─────────────────────────────────────
create or replace function public.join_activity(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  insert into public.activity_participants(activity_id, user_id)
  values (p_activity_id, auth.uid())
  on conflict (activity_id, user_id) do nothing;

  select conversation_id into v_conv_id
  from public.world_map_activities where id = p_activity_id;

  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id) returning id into v_conv_id;
    update public.world_map_activities
    set conversation_id = v_conv_id where id = p_activity_id;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── 7. RPC: leave_activity ────────────────────────────────────
create or replace function public.leave_activity(p_activity_id uuid)
returns void language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  delete from public.activity_participants
  where activity_id = p_activity_id and user_id = auth.uid();

  select conversation_id into v_conv_id
  from public.world_map_activities where id = p_activity_id;

  if v_conv_id is not null then
    delete from public.conversation_members
    where conversation_id = v_conv_id and user_id = auth.uid();
  end if;
end;
$$;

-- ── 8. RPC: create_activity_chat ─────────────────────────────
create or replace function public.create_activity_chat(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  select conversation_id into v_conv_id
  from public.world_map_activities where id = p_activity_id;

  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id) returning id into v_conv_id;
    update public.world_map_activities
    set conversation_id = v_conv_id where id = p_activity_id;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── 9. RPC: join_activity_chat ────────────────────────────────
create or replace function public.join_activity_chat(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  select conversation_id into v_conv_id
  from public.world_map_activities where id = p_activity_id;

  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id) returning id into v_conv_id;
    update public.world_map_activities
    set conversation_id = v_conv_id where id = p_activity_id;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;
