-- ============================================================
-- Phase 96: Beitritt mit Anfrage im Community-Chat, Gemeinde-Fragen mit
-- Benachrichtigung, Reparatur der Benachrichtigungen. Idempotent.
-- ============================================================
--
-- 1. Beitrittsanfragen landen als Chat-Nachricht (type 'join_request') im
--    Community-Chat; Admins nehmen dort an/lehnen ab (optional mit Text).
--    Läuft über SECURITY-DEFINER-RPCs, weil Nicht-Mitglieder weder in den
--    Chat schreiben noch Mitglieder einfügen dürfen.
-- 2. Gemeinden: Frage → Admins werden benachrichtigt, Antwort → Fragesteller.
-- 3. FEHLER GEFUNDEN: notifications_type_check enthielt 'message' nicht →
--    JEDE Direktnachricht-Benachrichtigung scheiterte still (0 Zeilen live).
--    'friend_accepted' und 'community_event' hatten nie einen Trigger.
-- 4. FEHLER GEFUNDEN: Beitritt per Code war für private Communities per RLS
--    gesperrt (Community nicht lesbar + Insert nur bei öffentlich/offen).

-- ── Spalten ──────────────────────────────────────────────────
alter table public.community_join_requests
  add column if not exists message text,
  add column if not exists decision_note text;

alter table public.messages
  add column if not exists join_request_id uuid
  references public.community_join_requests(id) on delete set null;

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type = any (array['text', 'prayer_request', 'bible_verse', 'join_request']::text[]));

-- Benachrichtigungstypen (bestehende Liste + 'message' + neue Community-Typen)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'oikos_entry', 'prayer_log', 'prayer_shared', 'community_invite',
    'connection_request', 'connection_accepted', 'friend_request',
    'friend_accepted', 'community_event', 'birthday', 'feed_post',
    'prayer_reminder', 'sibling_requests_reminder', 'weekly_digest',
    'bible_note_comment', 'message',
    'community_join_request', 'community_join_decision',
    'community_question', 'community_answer'
  ]::text[]));

-- Mitglieder sehen den Status von Anfragen (für die Karte im Chat)
drop policy if exists "Anfragen lesen" on public.community_join_requests;
create policy "Anfragen lesen" on public.community_join_requests for select
  using (
    user_id = (select auth.uid())
    or community_id in (select get_my_community_ids())
  );

-- Private Communities können keine Anfragen bekommen (nicht auffindbar)
update public.communities set join_mode = 'open' where is_public = false and join_mode = 'request';
-- Gemeinden/Hausgemeinden: standardmäßig Beitritt mit Anfrage
update public.communities set join_mode = 'request' where community_type = 'gemeinde' and join_mode = 'open';

-- ── Anfrage stellen (+ Chat-Nachricht + Admin-Benachrichtigung) ──
create or replace function public.request_to_join_community(p_community_id uuid, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c communities%rowtype;
  v_msg text := nullif(left(trim(coalesce(p_message, '')), 500), '');
  v_req uuid;
  v_conv uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_c from communities where id = p_community_id;
  if v_c.id is null or not v_c.is_public or v_c.join_mode <> 'request' then
    raise exception 'Für diese Community ist keine Beitrittsanfrage möglich';
  end if;
  if exists (select 1 from community_members where community_id = p_community_id and user_id = v_uid) then
    raise exception 'Du bist bereits Mitglied';
  end if;
  if exists (select 1 from community_join_requests where community_id = p_community_id and user_id = v_uid and status = 'pending') then
    raise exception 'Deine Anfrage ist bereits offen';
  end if;

  insert into community_join_requests (community_id, user_id, message)
  values (p_community_id, v_uid, v_msg) returning id into v_req;

  select id into v_conv from conversations where community_id = p_community_id and type = 'community' limit 1;
  if v_conv is null then
    insert into conversations (type, community_id) values ('community', p_community_id) returning id into v_conv;
  end if;
  insert into messages (conversation_id, sender_id, type, text, join_request_id)
  values (v_conv, v_uid, 'join_request', v_msg, v_req);

  select coalesce(full_name, username, 'Jemand') into v_name from profiles where id = v_uid;
  insert into notifications (user_id, type, title, body, data)
  select cm.user_id, 'community_join_request',
         v_name || ' möchte ' || v_c.name || ' beitreten 🙋',
         coalesce(v_msg, 'Beitrittsanfrage'),
         jsonb_build_object('community_id', p_community_id, 'request_id', v_req, 'requester_id', v_uid,
                            'url', '/community/' || p_community_id)
  from community_members cm
  where cm.community_id = p_community_id and cm.role = 'admin' and cm.user_id <> v_uid;

  return v_req;
end;
$$;

-- ── Anfrage entscheiden (optional mit Text), benachrichtigt den Anfragenden ──
create or replace function public.decide_join_request(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req community_join_requests%rowtype;
  v_c communities%rowtype;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  select * into v_req from community_join_requests where id = p_request_id and status = 'pending';
  if v_req.id is null then raise exception 'Anfrage nicht gefunden oder bereits bearbeitet'; end if;
  if not exists (select 1 from community_members where community_id = v_req.community_id and user_id = auth.uid() and role = 'admin') then
    raise exception 'Nur Admins dürfen Beitrittsanfragen bearbeiten';
  end if;

  update community_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = v_note
   where id = p_request_id;

  select * into v_c from communities where id = v_req.community_id;
  if p_approve then
    insert into community_members (community_id, user_id, role)
    values (v_req.community_id, v_req.user_id, 'member') on conflict do nothing;
  end if;

  insert into notifications (user_id, type, title, body, data)
  values (
    v_req.user_id, 'community_join_decision',
    case when p_approve then 'Willkommen in ' || v_c.name || ' 🎉' else 'Deine Anfrage an ' || v_c.name || ' wurde abgelehnt' end,
    coalesce(v_note, case when p_approve then 'Deine Beitrittsanfrage wurde angenommen' else 'Deine Beitrittsanfrage wurde leider abgelehnt' end),
    jsonb_build_object('community_id', v_req.community_id, 'approved', p_approve,
                       'url', case when p_approve then '/community/' || v_req.community_id else '/friends' end)
  );
end;
$$;

-- Altes 2-Parameter-RPC delegiert (kein DROP nötig, siehe CLAUDE.md)
create or replace function public.respond_to_join_request(p_request_id uuid, p_approve boolean)
returns void
language sql
security definer
set search_path = public
as $$ select public.decide_join_request(p_request_id, p_approve, null); $$;

-- ── Beitritt per Einladungscode (auch private Communities) ──
create or replace function public.join_community_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c communities%rowtype;
begin
  if v_uid is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_c from communities where invite_code = upper(trim(p_code));
  if v_c.id is null then raise exception 'Kein gültiger Code'; end if;
  if exists (select 1 from community_members where community_id = v_c.id and user_id = v_uid) then
    raise exception 'Du bist bereits in dieser Community';
  end if;
  insert into community_members (community_id, user_id, role) values (v_c.id, v_uid, 'member');
  return jsonb_build_object('id', v_c.id, 'name', v_c.name);
end;
$$;

-- ── Gemeinde-Fragen: Benachrichtigungen ──
create or replace function public.notify_on_community_question()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_c communities%rowtype; v_name text;
begin
  select * into v_c from communities where id = new.community_id;
  select coalesce(full_name, username, 'Jemand') into v_name from profiles where id = new.asked_by;
  insert into notifications (user_id, type, title, body, data)
  select cm.user_id, 'community_question',
         v_name || ' hat eine Frage an ' || coalesce(v_c.name, 'die Gemeinde') || ' ❓',
         left(new.question, 140),
         jsonb_build_object('community_id', new.community_id, 'question_id', new.id,
                            'url', '/community/' || new.community_id || '?tab=questions')
  from community_members cm
  where cm.community_id = new.community_id and cm.role = 'admin' and cm.user_id <> new.asked_by;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_community_question_insert on public.community_questions;
create trigger on_community_question_insert
  after insert on public.community_questions
  for each row execute function public.notify_on_community_question();

create or replace function public.notify_on_community_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_c communities%rowtype;
begin
  if new.answer is null or new.answer is not distinct from old.answer then return new; end if;
  if new.asked_by = new.answered_by then return new; end if;
  select * into v_c from communities where id = new.community_id;
  insert into notifications (user_id, type, title, body, data)
  values (
    new.asked_by, 'community_answer',
    coalesce(v_c.name, 'Die Gemeinde') || ' hat deine Frage beantwortet 💬',
    left(new.answer, 140),
    jsonb_build_object('community_id', new.community_id, 'question_id', new.id,
                       'url', '/world?gemeinde=' || new.community_id)
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_community_answer_update on public.community_questions;
create trigger on_community_answer_update
  after update of answer on public.community_questions
  for each row execute function public.notify_on_community_answer();

-- ── Bisher fehlende Benachrichtigungen ──
-- Freundschaft angenommen → Anfragenden benachrichtigen
create or replace function public.notify_on_friend_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if new.status is distinct from 'accepted' or old.status is not distinct from 'accepted' then return new; end if;
  select coalesce(full_name, username, 'Jemand') into v_name from profiles where id = new.addressee_id;
  insert into notifications (user_id, type, title, body, data)
  values (new.requester_id, 'friend_accepted',
          v_name || ' hat deine Anfrage angenommen 🤝', 'Ihr seid jetzt verbunden',
          jsonb_build_object('friendship_id', new.id, 'user_id', new.addressee_id,
                             'url', '/user/' || new.addressee_id));
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_friendship_accepted on public.friendships;
create trigger on_friendship_accepted
  after update of status on public.friendships
  for each row execute function public.notify_on_friend_accepted();

-- Neues Community-Event → Mitglieder benachrichtigen
create or replace function public.notify_on_community_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_c communities%rowtype;
begin
  select * into v_c from communities where id = new.community_id;
  insert into notifications (user_id, type, title, body, data)
  select cm.user_id, 'community_event',
         'Neues Event in ' || coalesce(v_c.name, 'deiner Community') || ' 📅',
         left(new.title, 140),
         jsonb_build_object('community_id', new.community_id, 'event_id', new.id,
                            'url', '/community/' || new.community_id || '?tab=events')
  from community_members cm
  where cm.community_id = new.community_id and cm.user_id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_community_event_insert on public.community_events;
create trigger on_community_event_insert
  after insert on public.community_events
  for each row execute function public.notify_on_community_event();
