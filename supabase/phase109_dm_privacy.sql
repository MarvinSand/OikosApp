-- ============================================================
-- Phase 109: Direktnachrichten an alle – optional nur für Geschwister
-- ============================================================
-- Standard: Jeder darf jedem eine Direktnachricht schreiben (auch ohne
-- Freundschaft). Wer das nicht möchte, setzt profiles.dm_siblings_only = true
-- (Einstellungen → Datenschutz); dann dürfen nur verbundene Geschwister
-- (friendships.status = 'accepted') neue Chats beginnen bzw. schreiben.
-- Antworten bleiben möglich, wenn die geschützte Person selbst zuerst
-- geschrieben hat. Idempotent.

alter table public.profiles
  add column if not exists dm_siblings_only boolean not null default false;

grant select, update (dm_siblings_only) on public.profiles to authenticated;

create or replace function public.can_message_user(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_other = auth.uid()
    or not coalesce((select dm_siblings_only from public.profiles where id = p_other), false)
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p_other)
          or (f.requester_id = p_other and f.addressee_id = auth.uid()))
    );
$$;

revoke all on function public.can_message_user(uuid) from public, anon;
grant execute on function public.can_message_user(uuid) to authenticated;

create or replace function public.start_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_conv_id uuid;
begin
  if public.is_blocked_pair(other_user_id) then
    raise exception 'user_blocked' using errcode = 'P0001';
  end if;

  select cm1.conversation_id into v_conv_id
  from conversation_members cm1
  join conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  join conversations c on c.id = cm1.conversation_id
  where cm1.user_id = auth.uid()
    and cm2.user_id = other_user_id
    and c.type = 'direct'
  limit 1;

  if v_conv_id is not null then
    return v_conv_id;
  end if;

  if not public.can_message_user(other_user_id) then
    raise exception 'dm_restricted' using errcode = 'P0001';
  end if;

  insert into conversations (type) values ('direct') returning id into v_conv_id;

  insert into conversation_members (conversation_id, user_id)
  values (v_conv_id, auth.uid()), (v_conv_id, other_user_id);

  return v_conv_id;
end;
$function$;

-- Auch bestehende Chats: keine Nachrichten an Personen mit „nur Geschwister",
-- außer sie haben dort selbst schon geschrieben.
drop policy if exists "Direct messages respect dm_siblings_only" on public.messages;
create policy "Direct messages respect dm_siblings_only"
  on public.messages as restrictive for insert to authenticated
  with check (
    not exists (
      select 1
      from public.conversations c
      join public.conversation_members cm on cm.conversation_id = c.id
      where c.id = messages.conversation_id
        and c.type = 'direct'
        and cm.user_id <> (select auth.uid())
        and not public.can_message_user(cm.user_id)
        and not exists (
          select 1 from public.messages m
          where m.conversation_id = c.id and m.sender_id = cm.user_id
        )
    )
  );
