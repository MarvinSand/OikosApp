-- ============================================================
-- Phase 74: Bekenntnisse - exakte Bibelstellen-Auswahl + Sichtbarkeit
-- wie beim Feed-Post-Composer (Community / Geschwister / Ausgewählte
-- Geschwister statt nur privat/öffentlich)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Bibelstellen strukturiert speichern (wie feed_posts/personal_prayer_requests,
-- siehe phase62_bible_verse_links.sql) statt nur als Freitext, damit die
-- VersePickerSheet-Auswahl (exakter Vers statt getipptem Text) übernommen
-- werden kann. bible_reference (bestehende Spalte) bleibt das Anzeige-Label.
alter table public.creed_lines
  add column if not exists bible_verse       text,
  add column if not exists bible_id          text,
  add column if not exists bible_book        text,
  add column if not exists bible_chapter     integer,
  add column if not exists bible_verse_start integer,
  add column if not exists bible_verse_end   integer;

-- Sichtbarkeit wie beim Feed-Post-Composer: öffentlich / privat / Community /
-- meine Geschwister / ausgewählte Geschwister (statt nur privat/öffentlich).
alter table public.creeds drop constraint if exists creeds_visibility_check;
alter table public.creeds add constraint creeds_visibility_check
  check (visibility = any (array['private', 'public', 'community', 'siblings', 'specific_include']));

alter table public.creeds
  add column if not exists visibility_community_id uuid references public.communities(id) on delete set null,
  add column if not exists visibility_user_ids uuid[] not null default '{}';

create index if not exists idx_creeds_visibility_community_id
  on public.creeds (visibility_community_id) where visibility_community_id is not null;

-- Read-Policy um Community/Geschwister/Ausgewählte-Geschwister erweitert
-- (identische Logik zu personal_prayer_requests/feed_posts).
drop policy if exists "Read public creeds" on public.creeds;
create policy "Read public creeds" on public.creeds
  for select using (
    visibility = 'public'
    or user_id is null
    or (visibility = 'community' and exists (
         select 1 from public.community_members cm
         where cm.community_id = creeds.visibility_community_id
           and cm.user_id = (select auth.uid())
       ))
    or (visibility = 'siblings' and exists (
         select 1 from public.friendships f
         where f.status = 'accepted' and (
           (f.requester_id = creeds.user_id and f.addressee_id = (select auth.uid()))
           or (f.addressee_id = creeds.user_id and f.requester_id = (select auth.uid()))
         )
       ))
    or (visibility = 'specific_include' and (select auth.uid()) = any(coalesce(creeds.visibility_user_ids, '{}'::uuid[])))
  );

-- App-Store-Richtlinie 1.2: Nutzerinhalte blockierter Nutzer ausblenden
-- (Bekenntnisse hatten diese Policy bisher gar nicht).
drop policy if exists "Hide blocked users" on public.creeds;
create policy "Hide blocked users" on public.creeds
  as restrictive for select to authenticated
  using (user_id is null or not public.is_blocked_pair(user_id));

-- creed_lines folgt jetzt einfach der Sichtbarkeit der übergeordneten
-- creeds-Zeile (die RLS von `creeds` greift bereits in dieser Subquery),
-- statt die Bedingungen ein zweites Mal - und dabei unvollständig,
-- ohne community/siblings/specific_include - nachzubilden.
drop policy if exists "Read creed lines" on public.creed_lines;
create policy "Read creed lines" on public.creed_lines
  for select using (
    exists (select 1 from public.creeds c where c.id = creed_lines.creed_id)
  );
