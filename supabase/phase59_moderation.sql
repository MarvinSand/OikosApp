-- ════════════════════════════════════════════════════════════════════════
-- Phase 59: Moderation – Melden & Blockieren (Apple Guideline 1.2)
-- ════════════════════════════════════════════════════════════════════════
--
-- Apps mit nutzergenerierten Inhalten (Feed, Kommentare, Chat, Communities)
-- müssen laut App Store Review Guideline 1.2 vier Dinge bieten:
--   • einen Filter gegen anstößige Inhalte
--   • eine Meldefunktion
--   • das Blockieren einzelner Nutzer
--   • eine Kontaktmöglichkeit zum Betreiber
-- Bis hierher gab es davon nichts. Diese Migration liefert die Datenbasis.
--
-- Idempotent – kann mehrfach ausgeführt werden.

-- ── Gemeldete Inhalte ───────────────────────────────────────────────────
create table if not exists public.content_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles(id) on delete cascade,
  target_type    text not null check (target_type in ('post', 'comment', 'message', 'profile', 'community', 'prayer')),
  target_id      uuid not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  reason         text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'selfharm', 'other')),
  details        text,
  status         text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at     timestamptz not null default now(),
  -- Derselbe Nutzer soll denselben Inhalt nicht mehrfach melden können.
  unique (reporter_id, target_type, target_id)
);

create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

drop policy if exists "report_insert_own" on public.content_reports;
create policy "report_insert_own" on public.content_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- Bewusst nur die eigenen Meldungen lesbar: die Meldeliste anderer Nutzer
-- geht niemanden etwas an. Die Sichtung passiert im Supabase-Dashboard.
drop policy if exists "report_select_own" on public.content_reports;
create policy "report_select_own" on public.content_reports
  for select to authenticated
  using (reporter_id = auth.uid());

-- ── Blockierte Nutzer ───────────────────────────────────────────────────
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

drop policy if exists "block_select_own" on public.blocked_users;
create policy "block_select_own" on public.blocked_users
  for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "block_insert_own" on public.blocked_users;
create policy "block_insert_own" on public.blocked_users
  for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "block_delete_own" on public.blocked_users;
create policy "block_delete_own" on public.blocked_users
  for delete to authenticated
  using (blocker_id = auth.uid());

-- ── Hilfsfunktion: gilt zwischen zwei Nutzern eine Blockierung? ─────────
-- Beidseitig: wer blockiert wurde, soll den Blockierenden ebenfalls nicht
-- mehr sehen – sonst merkt er die Blockierung sofort und weicht aus.
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users
     where (blocker_id = a and blocked_id = b)
        or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated;

-- ── Alle IDs, die für den aufrufenden Nutzer unsichtbar sind ────────────
-- Vom Frontend genutzt, um Feed, Kommentare und Chatliste zu filtern.
create or replace function public.blocked_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select blocked_id from public.blocked_users where blocker_id = auth.uid()
  union
  select blocker_id from public.blocked_users where blocked_id = auth.uid();
$$;

grant execute on function public.blocked_ids() to authenticated;

-- ── Blockierung wirkt auch auf bestehende Freundschaften ────────────────
-- Beim Blockieren wird eine eventuelle Freundschaft aufgelöst, sonst
-- bleiben die beiden über Freundeslisten und "Geschwister"-Ansichten
-- weiterhin miteinander verbunden.
create or replace function public.block_user(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nicht angemeldet';
  end if;
  if uid = p_target then
    raise exception 'Man kann sich nicht selbst blockieren';
  end if;

  insert into public.blocked_users (blocker_id, blocked_id)
  values (uid, p_target)
  on conflict do nothing;

  delete from public.friendships
   where (requester_id = uid and addressee_id = p_target)
      or (requester_id = p_target and addressee_id = uid);
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
