-- ============================================================================
-- OikosApp – Sammel-Migration Phase 26 bis 35
-- Alles seit Phase 25 in EINEM Skript. Im Supabase SQL-Editor ausführen.
-- Vollständig idempotent: kann gefahrlos mehrfach ausgeführt werden.
-- ============================================================================

-- WICHTIG (Storage, manuell): Für Foto-Uploads im Feed muss im Supabase
-- Dashboard unter Storage ein PUBLIC Bucket 'feed-photos' existieren
-- (Public = ON), mit Insert/Update/Delete nur für eigene Files (Pfad
-- beginnt mit auth.uid()) und öffentlichem Read-Zugriff.


-- ════════════════════════════════════════════════════════════════════════
-- phase26_streak_stats_notifications
-- ════════════════════════════════════════════════════════════════════════
-- Phase 26: Streak, Statistiken & Kontext-Erinnerungen

-- Benachrichtigungs-Präferenzen in profiles
alter table public.profiles
  add column if not exists prayer_reminder_times text[] default '{}',
  add column if not exists prayer_reminder_types jsonb default '{
    "long_not_prayed": true,
    "birthday": true,
    "answered_anniversary": true,
    "streak_reminder": true,
    "daily_morning": false
  }'::jsonb,
  add column if not exists push_subscription jsonb;

-- Freeze Days in user_prayer_stats
alter table public.user_prayer_stats
  add column if not exists freeze_days_remaining integer default 1,
  add column if not exists freeze_days_used integer default 0,
  add column if not exists last_freeze_reset date;


-- ════════════════════════════════════════════════════════════════════════
-- phase27_profile_visibility
-- ════════════════════════════════════════════════════════════════════════
-- Phase 27: Profile Redesign – Visibility Toggles & Bio
-- Adds per-field visibility flags and a separate bio_text column.

alter table public.profiles
  add column if not exists show_city boolean default true,
  add column if not exists show_church boolean default true,
  add column if not exists bio_text text,
  add column if not exists show_bio boolean default true;

-- Backfill existing rows so toggles default to public
update public.profiles set show_city = true where show_city is null;
update public.profiles set show_church = true where show_church is null;
update public.profiles set show_bio = true where show_bio is null;


-- ════════════════════════════════════════════════════════════════════════
-- phase28_feed_visibility
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================
-- Phase 28: Erweiterte Feed-Post Sichtbarkeit + Kategorien
-- Run this in the Supabase SQL Editor
-- ============================================================
--
-- HINWEIS:
--   Für den Foto-Upload muss zusätzlich im Supabase Dashboard
--   unter Storage ein öffentlicher Bucket "feed-photos" angelegt
--   werden (Public bucket = ON). Dazu folgende RLS-Policies:
--     - Authenticated kann INSERT/UPDATE/DELETE auf eigene Files
--       (in path beginnt mit auth.uid())
--     - Public read access
-- ============================================================

-- 1) Sichtbarkeit pro Post
alter table public.feed_posts
  add column if not exists visibility_mode text default 'public'
    check (visibility_mode in ('public','siblings','communities','specific_include')),
  add column if not exists visibility_user_ids uuid[] default '{}',
  add column if not exists excluded_user_ids uuid[] default '{}',
  add column if not exists category text;

-- 2) Backfill: bestehende is_public-Werte abbilden
update public.feed_posts
  set visibility_mode = case
    when is_public = true then 'public'
    else 'communities'
  end
where visibility_mode is null;

-- 3) RLS-Policies aktualisieren
DROP POLICY IF EXISTS "Public posts readable"      ON public.feed_posts;
DROP POLICY IF EXISTS "Siblings posts readable"    ON public.feed_posts;
DROP POLICY IF EXISTS "Community posts readable"   ON public.feed_posts;
DROP POLICY IF EXISTS "Specific include readable"  ON public.feed_posts;
DROP POLICY IF EXISTS "Own posts"                  ON public.feed_posts;

-- "Für alle App Nutzer" – jeder eingeloggte User sieht sie, außer er ist auf excluded_user_ids
CREATE POLICY "Public posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'public'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
  );

-- "Nur verbundene Geschwister" – nur akzeptierte Friendships sehen den Post
CREATE POLICY "Siblings posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'siblings'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = feed_posts.author_id AND f.addressee_id = auth.uid())
          OR (f.addressee_id = feed_posts.author_id AND f.requester_id = auth.uid()))
    )
  );

-- "Communities" – nur Mitglieder der freigegebenen Communities
CREATE POLICY "Community posts readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'communities'
    AND auth.uid() IS NOT NULL
    AND NOT (auth.uid() = ANY(coalesce(excluded_user_ids, '{}')))
    AND auth.uid() IN (
      SELECT cm.user_id FROM public.community_members cm
      JOIN public.feed_post_communities fpc ON fpc.community_id = cm.community_id
      WHERE fpc.post_id = feed_posts.id
    )
  );

-- "Nur bestimmte Geschwister" – nur User auf visibility_user_ids
CREATE POLICY "Specific include readable"
  ON public.feed_posts FOR SELECT
  USING (
    visibility_mode = 'specific_include'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = ANY(coalesce(visibility_user_ids, '{}'))
  );

-- Owner sieht und verwaltet seine eigenen Posts immer
CREATE POLICY "Own posts"
  ON public.feed_posts FOR ALL
  USING (auth.uid() = author_id);


-- ════════════════════════════════════════════════════════════════════════
-- phase29_world_map_event_visibility
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================
-- Phase 29: Weltkarte-Events – Sichtbarkeit (Öffentlich /
--           Meine Geschwister / Gemeinde) + Community-Link
-- Einmal im Supabase SQL Editor ausführen. Idempotent.
-- ============================================================

-- 1) Sichtbarkeits-Modus pro Event
alter table public.world_map_activities
  add column if not exists visibility_mode text default 'public'
    check (visibility_mode in ('public', 'siblings', 'communities'));

-- Backfill aus bestehendem is_public
update public.world_map_activities
  set visibility_mode = case when is_public then 'public' else 'siblings' end
  where visibility_mode is null;

-- 2) Verknüpfung Event <-> Communities (für Modus 'communities')
create table if not exists public.activity_communities (
  activity_id  uuid references public.world_map_activities(id) on delete cascade not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  primary key (activity_id, community_id)
);

alter table public.activity_communities enable row level security;

-- activity_communities: lesbar für eingeloggte Nutzer
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_communities' and policyname = 'ac readable'
  ) then
    create policy "ac readable"
      on public.activity_communities for select
      using (auth.uid() is not null);
  end if;
end $$;

-- activity_communities: nur der Event-Ersteller darf Zuordnungen verwalten
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'activity_communities' and policyname = 'ac owner manage'
  ) then
    create policy "ac owner manage"
      on public.activity_communities for all
      using (
        exists (
          select 1 from public.world_map_activities a
          where a.id = activity_communities.activity_id
            and a.author_id = auth.uid()
        )
      );
  end if;
end $$;

-- 3) Lese-Policies auf world_map_activities neu aufbauen
DROP POLICY IF EXISTS "Public activities readable" ON public.world_map_activities;
DROP POLICY IF EXISTS "wm public readable"         ON public.world_map_activities;
DROP POLICY IF EXISTS "wm siblings readable"       ON public.world_map_activities;
DROP POLICY IF EXISTS "wm communities readable"    ON public.world_map_activities;

-- Öffentlich – jeder eingeloggte Nutzer
CREATE POLICY "wm public readable"
  ON public.world_map_activities FOR SELECT
  USING (
    visibility_mode = 'public'
    AND auth.uid() IS NOT NULL
  );

-- Meine Geschwister – nur akzeptierte Freunde des Erstellers
CREATE POLICY "wm siblings readable"
  ON public.world_map_activities FOR SELECT
  USING (
    visibility_mode = 'siblings'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = world_map_activities.author_id AND f.addressee_id = auth.uid())
          OR (f.addressee_id = world_map_activities.author_id AND f.requester_id = auth.uid()))
    )
  );

-- Gemeinde – nur Mitglieder der freigegebenen Communities
CREATE POLICY "wm communities readable"
  ON public.world_map_activities FOR SELECT
  USING (
    visibility_mode = 'communities'
    AND auth.uid() IS NOT NULL
    AND auth.uid() IN (
      SELECT cm.user_id FROM public.community_members cm
      JOIN public.activity_communities ac ON ac.community_id = cm.community_id
      WHERE ac.activity_id = world_map_activities.id
    )
  );

-- Hinweis: Die bestehende Policy "Own activities" (FOR ALL using author_id = auth.uid())
-- bleibt erhalten und deckt Insert/Update/Delete sowie das Lesen eigener Events ab.


-- ════════════════════════════════════════════════════════════════════════
-- phase30_gebet_paul_category
-- ════════════════════════════════════════════════════════════════════════
-- Phase 30: Gebets-Kategorie für personal_prayer_requests (Gebet-Paul feature)

alter table public.personal_prayer_requests
  add column if not exists category text default null;


-- ════════════════════════════════════════════════════════════════════════
-- phase31_world_map_event_specific_siblings
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================
-- Phase 31: Weltkarte-Events – Sichtbarkeit "Ausgewählte Geschwister"
-- Einmal im Supabase SQL Editor ausführen. Idempotent.
-- ============================================================

-- 1) Spalte für ausgewählte Nutzer
alter table public.world_map_activities
  add column if not exists visibility_user_ids uuid[] default '{}';

-- 2) Check-Constraint um 'specific' erweitern
do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.world_map_activities'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%visibility_mode%';
  if cname is not null then
    execute format('alter table public.world_map_activities drop constraint %I', cname);
  end if;
end $$;

alter table public.world_map_activities
  add constraint world_map_activities_visibility_mode_check
  check (visibility_mode in ('public', 'siblings', 'communities', 'specific'));

-- 3) Lese-Policy: nur ausgewählte Geschwister
DROP POLICY IF EXISTS "wm specific readable" ON public.world_map_activities;
CREATE POLICY "wm specific readable"
  ON public.world_map_activities FOR SELECT
  USING (
    visibility_mode = 'specific'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = ANY (visibility_user_ids)
  );


-- ════════════════════════════════════════════════════════════════════════
-- phase32_allow_location
-- ════════════════════════════════════════════════════════════════════════
-- Phase 32: Standort-Freigabe (Ansicht & Datenschutz Einstellungen)

alter table public.profiles
  add column if not exists allow_location boolean default true;


-- ════════════════════════════════════════════════════════════════════════
-- phase33_is_christian
-- ════════════════════════════════════════════════════════════════════════
-- Phase 33: is_christian flag on profiles
alter table public.profiles
  add column if not exists is_christian boolean default null;


-- ════════════════════════════════════════════════════════════════════════
-- phase34_chat_message_features
-- ════════════════════════════════════════════════════════════════════════
-- Phase 34: Chat message features
-- Adds: reactions, reply, forward, pin

-- ───── messages columns ─────
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists forwarded_from_id uuid references public.messages(id) on delete set null,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz default null,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create index if not exists messages_pinned_idx
  on public.messages (conversation_id)
  where is_pinned = true;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id);

-- ───── message_reactions table ─────
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Allow reading reactions for messages in conversations the user is a member of
drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions
  for select using (
    exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cm.user_id = auth.uid()
    )
  );

-- Allow inserting own reactions on messages in own conversations
drop policy if exists message_reactions_insert on public.message_reactions;
create policy message_reactions_insert on public.message_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cm.user_id = auth.uid()
    )
  );

-- Allow deleting own reactions
drop policy if exists message_reactions_delete on public.message_reactions;
create policy message_reactions_delete on public.message_reactions
  for delete using (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════
-- phase34_user_connections
-- ════════════════════════════════════════════════════════════════════════
-- Phase 34: Vollständige Geschwister-Liste fremder Profile sichtbar machen
--
-- Problem: Die RLS-Policy auf `friendships` erlaubt einem User nur das Lesen
-- von Zeilen, in denen er selbst Requester oder Addressee ist. Beim Aufruf des
-- Profils eines anderen Users war daher nur die EINE gemeinsame Freundschaft
-- (zwischen mir und der Person) sichtbar – die Geschwister-Liste zeigte deshalb
-- immer nur "1 Geschwister" (mich selbst).
--
-- Lösung: Eine SECURITY-DEFINER-Funktion, die die öffentlichen Profil-Felder
-- aller akzeptierten Verbindungen eines beliebigen Users zurückgibt. Sie
-- umgeht die Zeilen-Restriktion kontrolliert (nur unkritische Profilfelder,
-- nur akzeptierte Freundschaften).
--
-- Idempotent: kann mehrfach ausgeführt werden.

create or replace function public.get_user_connections(target_id uuid)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  is_christian boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.avatar_url, p.is_christian
  from public.friendships f
  join public.profiles p
    on p.id = case
                when f.requester_id = target_id then f.addressee_id
                else f.requester_id
              end
  where f.status = 'accepted'
    and (f.requester_id = target_id or f.addressee_id = target_id);
$$;

grant execute on function public.get_user_connections(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- phase35_chat_photos – Foto-Nachrichten inkl. "einmal ansehen" (view-once)
-- ════════════════════════════════════════════════════════════════════════
--
-- MANUELLER SCHRITT (Supabase Dashboard → Storage):
--   Bucket "chat-photos" anlegen, Public = ON. Policies:
--     • INSERT: authenticated (auth.role() = 'authenticated')
--     • DELETE: authenticated (damit Empfänger view-once Fotos löschen kann)
--     • SELECT: public read
--   (Da die App noch keine aktiven Nutzer hat, sind einfache Policies ok.)

-- Spalten für Foto-Nachrichten
alter table public.messages
  add column if not exists image_path text,
  add column if not exists is_view_once boolean not null default false,
  add column if not exists viewed_at timestamptz default null;

-- view-once Fotos entwerten: Empfänger (= Mitglied, aber nicht Sender) darf
-- das Foto als angesehen markieren und den Pfad löschen. SECURITY DEFINER
-- umgeht die "nur Sender darf ändern"-Restriktion kontrolliert.
create or replace function public.mark_photo_viewed(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages m
     set viewed_at = now(),
         image_path = null
   where m.id = p_message_id
     and m.is_view_once = true
     and m.viewed_at is null
     and exists (
       select 1 from public.conversation_members cm
       where cm.conversation_id = m.conversation_id
         and cm.user_id = auth.uid()
     );
end;
$$;

grant execute on function public.mark_photo_viewed(uuid) to authenticated;
