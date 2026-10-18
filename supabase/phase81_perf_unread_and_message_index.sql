-- 20261018 perf_unread_and_message_index
-- Latest-message lookups (get_my_conversations, has_unread_conversations) had no usable index.
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS friendships_addressee_status_idx ON public.friendships (addressee_id, status);

-- Cheap EXISTS version with the same semantics as coalesce(bool_or(unread), false) over get_my_conversations():
-- a conversation is unread if its newest message (ignoring blocked senders) is not mine and newer than my last_read_at.
CREATE OR REPLACE FUNCTION public.has_unread_conversations()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select auth.uid() as uid),
  convs as (
    select c.id, c.type, mm.last_read_at
    from public.conversations c
    left join public.conversation_members mm on mm.conversation_id = c.id and mm.user_id = (select uid from me)
    where mm.user_id is not null
       or (c.type = 'community' and c.community_id in (select public.get_my_community_ids()))
  )
  select exists (
    select 1
    from convs b
    cross join lateral (
      select m.sender_id, m.created_at
      from public.messages m
      where m.conversation_id = b.id
        and not public.is_blocked_pair(m.sender_id)
      order by m.created_at desc
      limit 1
    ) lm
    where lm.sender_id is distinct from (select uid from me)
      and lm.created_at > coalesce(b.last_read_at, 'epoch'::timestamptz)
      and not (
        b.type = 'direct' and exists (
          select 1 from public.conversation_members bcm
          where bcm.conversation_id = b.id
            and bcm.user_id <> (select uid from me)
            and public.is_blocked_pair(bcm.user_id)
        )
      )
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.has_unread_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_unread_conversations() TO authenticated, service_role;
