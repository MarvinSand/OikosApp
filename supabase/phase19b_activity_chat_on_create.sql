-- Phase 19b: Chat wird sofort beim Erstellen einer Aktivität angelegt
-- Run AFTER phase19_activity_chat.sql in the Supabase SQL Editor

-- ── RPC: create_activity_chat ─────────────────────────────────
-- Erstellt Conversation für eine Aktivität und fügt den Aufrufer als Member hinzu.
-- Idempotent: wird der Chat erneut aufgerufen, wird nur der Member hinzugefügt.
create or replace function public.create_activity_chat(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  -- Prüfe ob schon eine Conversation existiert
  select conversation_id into v_conv_id
  from public.world_map_activities
  where id = p_activity_id;

  -- Neu anlegen falls noch nicht vorhanden
  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id)
    returning id into v_conv_id;

    update public.world_map_activities
    set conversation_id = v_conv_id
    where id = p_activity_id;
  end if;

  -- Aufrufer als Chat-Member hinzufügen (idempotent)
  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

-- ── RPC: join_activity_chat ───────────────────────────────────
-- Tritt dem Aktivitäts-Chat bei (ohne als Aktivitäts-Teilnehmer gezählt zu werden).
-- Idempotent.
create or replace function public.join_activity_chat(p_activity_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id uuid;
begin
  select conversation_id into v_conv_id
  from public.world_map_activities
  where id = p_activity_id;

  -- Conversation on-demand erstellen falls noch nicht vorhanden
  if v_conv_id is null then
    insert into public.conversations(type, activity_id)
    values ('activity', p_activity_id)
    returning id into v_conv_id;

    update public.world_map_activities
    set conversation_id = v_conv_id
    where id = p_activity_id;
  end if;

  insert into public.conversation_members(conversation_id, user_id)
  values (v_conv_id, auth.uid())
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;
