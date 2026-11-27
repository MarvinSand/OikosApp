-- ============================================================
-- Phase 110: Fix – DM-Policy auf messages verursachte „infinite recursion“
-- ============================================================
-- Die Policy aus phase109 las in ihrer Bedingung selbst aus messages → jedes
-- INSERT scheiterte („infinite recursion detected in policy for relation
-- messages“), Nachrichten wurden nicht gespeichert. Die Prüfung läuft jetzt in
-- einer SECURITY-DEFINER-Funktion (umgeht RLS, keine Rekursion). Idempotent.

create or replace function public.dm_blocked_for_sender(p_conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_members cm on cm.conversation_id = c.id
    where c.id = p_conv
      and c.type = 'direct'
      and cm.user_id <> auth.uid()
      and not public.can_message_user(cm.user_id)
      and not exists (
        select 1 from public.messages m
        where m.conversation_id = c.id and m.sender_id = cm.user_id
      )
  );
$$;

revoke all on function public.dm_blocked_for_sender(uuid) from public, anon;
grant execute on function public.dm_blocked_for_sender(uuid) to authenticated;

drop policy if exists "Direct messages respect dm_siblings_only" on public.messages;
create policy "Direct messages respect dm_siblings_only"
  on public.messages as restrictive for insert to authenticated
  with check (not public.dm_blocked_for_sender(conversation_id));
