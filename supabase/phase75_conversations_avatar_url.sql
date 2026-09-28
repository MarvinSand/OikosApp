-- ============================================================
-- Phase 75: Fehlendes avatar_url in get_my_conversations()
-- ============================================================
-- Bug: In der Chat-Liste (FriendsView.jsx) wurde das Profilbild des
-- Gegenübers nie angezeigt bzw. nie aktualisiert, wenn es geändert wurde.
-- Ursache: get_my_conversations() (zuletzt überschrieben in
-- phase71_user_blocks.sql) baute `other_user` als jsonb_build_object mit
-- id/username/full_name/is_christian/gender – avatar_url fehlte komplett.
-- Das war kein Cache-Problem, die Spalte kam serverseitig nie mit.
-- Fix: avatar_url ergänzen, Rest unverändert (inkl. is_blocked_pair-Filter
-- aus phase71).

create or replace function public.get_my_conversations()
returns table(id uuid, type text, community_id uuid, activity_id uuid, last_read_at timestamp with time zone, last_message jsonb, other_user jsonb, community jsonb, activity jsonb, unread boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  with my_membership as (
    select conversation_id, last_read_at
    from conversation_members
    where user_id = auth.uid()
  ),
  base as (
    select c.id, c.type, c.community_id, c.activity_id, mm.last_read_at
    from conversations c
    left join my_membership mm on mm.conversation_id = c.id
    where (c.id in (select conversation_id from my_membership)
       or (c.type = 'community' and c.community_id in (select get_my_community_ids())))
      and not (
        c.type = 'direct' and exists (
          select 1 from conversation_members bcm
          where bcm.conversation_id = c.id
            and bcm.user_id <> auth.uid()
            and public.is_blocked_pair(bcm.user_id)
        )
      )
  )
  select
    b.id,
    b.type,
    b.community_id,
    b.activity_id,
    b.last_read_at,
    lm.last_message,
    ou.other_user,
    comm.community,
    act.activity,
    coalesce(
      (lm.last_message ->> 'sender_id') is distinct from auth.uid()::text
      and (lm.last_message ->> 'created_at')::timestamptz > coalesce(b.last_read_at, 'epoch'::timestamptz),
      false
    ) as unread
  from base b
  left join lateral (
    select jsonb_build_object(
      'id', m.id, 'conversation_id', m.conversation_id, 'sender_id', m.sender_id,
      'type', m.type, 'text', m.text, 'is_deleted', m.is_deleted, 'created_at', m.created_at
    ) as last_message
    from messages m
    where m.conversation_id = b.id
      and not public.is_blocked_pair(m.sender_id)
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select jsonb_build_object(
      'id', p.id, 'username', p.username, 'full_name', p.full_name,
      'is_christian', p.is_christian, 'gender', p.gender, 'avatar_url', p.avatar_url
    ) as other_user
    from conversation_members ocm
    join profiles p on p.id = ocm.user_id
    where ocm.conversation_id = b.id and ocm.user_id <> auth.uid()
    limit 1
  ) ou on b.type = 'direct'
  left join lateral (
    select jsonb_build_object('id', co.id, 'name', co.name) as community
    from communities co
    where co.id = b.community_id
  ) comm on b.type = 'community'
  left join lateral (
    select jsonb_build_object(
      'id', wa.id, 'title', wa.title, 'activity_emoji', wa.activity_emoji, 'activity_type', wa.activity_type
    ) as activity
    from world_map_activities wa
    where wa.id = b.activity_id
  ) act on b.type = 'activity';
$function$;
