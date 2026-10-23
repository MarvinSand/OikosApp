-- ============================================================
-- Phase 86: Sichtbarkeit für Bibel-Notizen (wie bei Gebeten/Bekenntnissen)
-- Run this in the Supabase SQL Editor
-- ============================================================
-- Bisher waren bible_notes strikt privat (RLS: nur user_id = auth.uid()).
-- Jetzt wie bei personal_prayer_requests/creeds: Privat/Öffentlich/Community/
-- Geschwister/Ausgewählte Geschwister.
--
-- Bewusste Abweichung vom Gebets-Vorbild: "Ausgewählte Geschwister" wird bei
-- personal_prayer_requests als visibility='siblings' + visibility_user_ids
-- gespeichert, aber die Policy dort prüft 'siblings' unabhängig von
-- visibility_user_ids - ein an X/Y geteiltes Gebet ist dadurch in Wirklichkeit
-- für ALLE Geschwister sichtbar. Hier stattdessen ein eigener Wert 'specific',
-- dessen Policy ausschließlich über visibility_user_ids-Mitgliedschaft greift
-- (wie bei creeds' 'specific_include', siehe phase74_creed_visibility_and_verse.sql).

alter table public.bible_notes
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private','public','community','siblings','specific')),
  add column if not exists visibility_community_id uuid references public.communities(id) on delete set null,
  add column if not exists visibility_user_ids uuid[] not null default '{}';

create index if not exists bible_notes_visibility_community_idx
  on public.bible_notes (visibility_community_id) where visibility_community_id is not null;

drop policy if exists "Own notes" on public.bible_notes;

-- Schreiben: ausschließlich durch die Autorin/den Autor.
create policy "Insert own notes" on public.bible_notes for insert
  with check ((select auth.uid()) = user_id);
create policy "Update own notes" on public.bible_notes for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own notes" on public.bible_notes for delete
  using ((select auth.uid()) = user_id);

-- Lesen: eigene Notizen immer; fremde nur gemäß Sichtbarkeit (Muster aus
-- phase57_community_prayers.sql / phase74_creed_visibility_and_verse.sql).
create policy "Read notes" on public.bible_notes for select
  using (
    user_id = (select auth.uid())
    or visibility = 'public'
    or (visibility = 'community' and exists (
         select 1 from public.community_members cm
         where cm.community_id = bible_notes.visibility_community_id
           and cm.user_id = (select auth.uid())))
    or (visibility = 'siblings' and exists (
         select 1 from public.friendships f
         where f.status = 'accepted' and (
           (f.requester_id = bible_notes.user_id and f.addressee_id = (select auth.uid()))
           or (f.addressee_id = bible_notes.user_id and f.requester_id = (select auth.uid())))))
    or (visibility = 'specific' and (select auth.uid()) = any(coalesce(bible_notes.visibility_user_ids, '{}'::uuid[])))
  );

-- App-Store-Richtlinie 1.2 (wie bei creeds/feed_posts): Notizen blockierter
-- Nutzer nie anzeigen.
drop policy if exists "Hide blocked users" on public.bible_notes;
create policy "Hide blocked users" on public.bible_notes
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or not public.is_blocked_pair(user_id));
