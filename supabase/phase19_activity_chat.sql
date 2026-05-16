-- Phase 19: Aktivitäts-Chat & RLS-Fix für activity_participants
-- Run this in the Supabase SQL Editor

-- ── 1. Add conversation_id to world_map_activities ────────────
alter table public.world_map_activities
add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

-- ── 2. Fix activity_participants RLS ─────────────────────────
-- Drop the catch-all "for all" policy (no WITH CHECK = inserts silently fail)
drop policy if exists "Auth manage participation" on public.activity_participants;

create policy "Participants: insert own"
  on public.activity_participants for insert
  with check (auth.uid() = user_id);

create policy "Participants: delete own"
  on public.activity_participants for delete
  using (auth.uid() = user_id);

-- ── 3. Allow reading activity conversations ───────────────────
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

-- ── 4. RPC: join_activity ─────────────────────────────────────
-- Atomic: insert participant + find/create conversation + join conversation
create or replace function public.join_activity(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  -- Join as participant (idempotent)
  insert into public.activity_participants(activity_id, user_id)
  values (p_activity_id, auth.uid())
  on conflict (activity_id, user_id) do nothing;

  -- Find existing conversation for this activity
  select conversation_id into v_conv_id
  from public.world_map_activities
  where id = p_activity_id;

  -- Create if not exists
  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id)
    returning id into v_conv_id;

    update public.world_map_activities
    set conversation_id = v_conv_id
    where id = p_activity_id;
  end if;

  -- Join conversation (idempotent)
  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── 5. RPC: leave_activity ────────────────────────────────────
create or replace function public.leave_activity(p_activity_id uuid)
returns void language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  delete from public.activity_participants
  where activity_id = p_activity_id and user_id = auth.uid();

  select conversation_id into v_conv_id
  from public.world_map_activities
  where id = p_activity_id;

  if v_conv_id is not null then
    delete from public.conversation_members
    where conversation_id = v_conv_id and user_id = auth.uid();
  end if;
end;
$$;
