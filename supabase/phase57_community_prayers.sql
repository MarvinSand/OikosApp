-- ════════════════════════════════════════════════════════════════════════
-- Phase 57: Gebete vereinheitlichen + Community-Banner
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Enthält:
--  1. personal_prayer_requests: is_pinned + source_message_id
--  2. visibility='community' wird endlich vom Check-Constraint akzeptiert
--  3. RLS: Community-Anliegen nur für Mitglieder, Geschwister-Anliegen nur
--     für verbundene Geschwister (vorher: alles Nicht-Private war für jeden
--     angemeldeten Nutzer lesbar)
--  4. Backfill: Community-Gebete lagen bisher als Chat-Nachrichten
--     (messages.type='prayer_request') + localStorage-Zähler vor. Sie werden
--     zu echten personal_prayer_requests mit visibility='community'.
--  5. communities.banner_url + Storage-Bucket community-banners
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Spalten ──────────────────────────────────────────────────────────
alter table public.personal_prayer_requests
  add column if not exists is_pinned boolean default false,
  add column if not exists source_message_id uuid references public.messages(id) on delete set null;

-- Ein Chat-Gebet darf nur genau einmal übernommen werden (Backfill mehrfach
-- ausführbar).
create unique index if not exists ppr_source_message_uidx
  on public.personal_prayer_requests(source_message_id)
  where source_message_id is not null;

create index if not exists ppr_visibility_community_idx
  on public.personal_prayer_requests(visibility_community_id)
  where visibility_community_id is not null;

-- ── 2. visibility-Werte: 'community' zulassen ───────────────────────────
-- Das Frontend schreibt seit jeher visibility='community' (Prayers.jsx),
-- erlaubt war aber nur 'communities' – jedes Community-Gebet scheiterte still
-- am Check-Constraint. Beide Schreibweisen sind jetzt gültig, Altbestand
-- ('communities') wird auf 'community' vereinheitlicht.
alter table public.personal_prayer_requests
  drop constraint if exists personal_prayer_requests_visibility_check;

update public.personal_prayer_requests
  set visibility = 'community'
  where visibility = 'communities';

alter table public.personal_prayer_requests
  add constraint personal_prayer_requests_visibility_check
  check (visibility = any (array['public', 'siblings', 'community', 'private']));

-- ── 3. RLS: Sichtbarkeit sauber trennen ─────────────────────────────────
alter table public.personal_prayer_requests enable row level security;

drop policy if exists "Nicht-private Anliegen lesbar" on public.personal_prayer_requests;
drop policy if exists "Read personal_prayer_requests" on public.personal_prayer_requests;

create policy "Read personal_prayer_requests" on public.personal_prayer_requests for select
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    -- Community-Anliegen: nur für Mitglieder der jeweiligen Community
    or (
      visibility = 'community'
      and exists (
        select 1 from public.community_members cm
        where cm.community_id = personal_prayer_requests.visibility_community_id
          and cm.user_id = auth.uid()
      )
    )
    -- Geschwister-Anliegen: nur für verbundene Geschwister
    or (
      visibility = 'siblings'
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = personal_prayer_requests.owner_id and f.addressee_id = auth.uid())
            or (f.addressee_id = personal_prayer_requests.owner_id and f.requester_id = auth.uid())
          )
      )
    )
    -- Gezielt an einzelne Geschwister geteilte Anliegen
    or auth.uid() = any(coalesce(visibility_user_ids, '{}'::uuid[]))
  );

-- ── 4. Backfill: Community-Chat-Gebete → personal_prayer_requests ───────
insert into public.personal_prayer_requests
  (owner_id, title, description, visibility, visibility_community_id, is_answered, created_at, source_message_id)
select
  m.sender_id,
  nullif(trim(m.text), ''),
  m.bible_verse_text,
  'community',
  c.community_id,
  false,
  m.created_at,
  m.id
from public.messages m
join public.conversations c on c.id = m.conversation_id
where m.type = 'prayer_request'
  and coalesce(m.is_deleted, false) = false
  and c.type = 'community'
  and c.community_id is not null
  and nullif(trim(m.text), '') is not null
  -- Nachrichten, die bereits auf ein echtes Anliegen zeigen, sind schon migriert
  and m.personal_prayer_request_id is null
  and m.prayer_request_id is null
on conflict (source_message_id) where source_message_id is not null do nothing;

-- Chat-Nachricht auf das neue Anliegen verlinken, damit die Chat-Blase
-- denselben Gebets-Zähler bedient wie der Gebete-Tab.
update public.messages m
set personal_prayer_request_id = p.id
from public.personal_prayer_requests p
where p.source_message_id = m.id
  and m.personal_prayer_request_id is distinct from p.id;

-- ── 5. Community-Banner ─────────────────────────────────────────────────
alter table public.communities
  add column if not exists banner_url text;

insert into storage.buckets (id, name, public)
values ('community-banners', 'community-banners', true)
on conflict (id) do update set public = true;

drop policy if exists "community banners readable" on storage.objects;
create policy "community banners readable" on storage.objects for select
  using (bucket_id = 'community-banners');

-- Schreiben/Löschen nur für Admins der Community. Der erste Pfadabschnitt ist
-- die community_id: <community_id>/banner.jpg
drop policy if exists "community banners writable by admins" on storage.objects;
create policy "community banners writable by admins" on storage.objects for insert
  with check (
    bucket_id = 'community-banners'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid()
        and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "community banners updatable by admins" on storage.objects;
create policy "community banners updatable by admins" on storage.objects for update
  using (
    bucket_id = 'community-banners'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid()
        and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "community banners deletable by admins" on storage.objects;
create policy "community banners deletable by admins" on storage.objects for delete
  using (
    bucket_id = 'community-banners'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid()
        and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

-- ── 6. Kommentare auch für Oikos-Anliegen ───────────────────────────────
-- prayer_notes hing bisher fest an personal_prayer_requests. Die Gebets-Karte
-- ist jetzt überall dieselbe und bietet Kommentare auch bei Oikos-Anliegen –
-- dafür bekommt die Tabelle eine zweite Referenz (XOR, wie prayer_list_items).
alter table public.prayer_notes
  alter column request_id drop not null,
  add column if not exists prayer_request_id uuid references public.prayer_requests(id) on delete cascade;

create index if not exists prayer_notes_prayer_request_idx
  on public.prayer_notes(prayer_request_id)
  where prayer_request_id is not null;

alter table public.prayer_notes
  drop constraint if exists prayer_notes_one_request_type;
alter table public.prayer_notes
  add constraint prayer_notes_one_request_type
  check ((request_id is null) != (prayer_request_id is null));

drop policy if exists "Read prayer_notes" on public.prayer_notes;
create policy "Read prayer_notes" on public.prayer_notes for select
  using (
    is_public = true
    or author_id = auth.uid()
    or exists (
      select 1 from public.personal_prayer_requests p
      where p.id = prayer_notes.request_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.prayer_requests r
      where r.id = prayer_notes.prayer_request_id and r.owner_id = auth.uid()
    )
  );
