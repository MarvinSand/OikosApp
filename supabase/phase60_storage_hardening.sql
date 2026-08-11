-- ════════════════════════════════════════════════════════════════════════
-- Phase 60: Storage absichern
-- ════════════════════════════════════════════════════════════════════════
--
-- Ausgangslage (dokumentiert in phase26_36_combined.sql, Zeile 434 ff.):
-- der Bucket "chat-photos" war Public = ON mit "SELECT: public read" und
-- "DELETE: authenticated". Daraus folgten drei Probleme:
--
--   1. Jedes private Chat-Foto war für jeden abrufbar, der die URL kannte.
--   2. Das Feature „einmal ansehen" war wirkungslos – die Datei blieb unter
--      ihrer öffentlichen URL erreichbar, auch nachdem sie in der DB als
--      angesehen markiert war.
--   3. Jeder angemeldete Nutzer konnte die Fotos und Avatare *aller*
--      anderen löschen.
--
-- Die Begründung von damals („die App hat noch keine aktiven Nutzer") trägt
-- vor einem Store-Release nicht mehr.
--
-- Pfad-Konventionen (aus dem Frontend):
--   avatars            <user_id>/avatar.jpg
--   feed-photos        <user_id>/<timestamp>.jpg
--   chat-photos        <conversation_id>/<user_id>/<timestamp>.<ext>
--   community-banners  <community_id>/banner.jpg
--
-- Idempotent – kann mehrfach ausgeführt werden.

-- ── 1. chat-photos privat schalten ──────────────────────────────────────
-- Das Frontend holt seit phase60 signierte URLs (useChat.photoUrl).
insert into storage.buckets (id, name, public)
values ('chat-photos', 'chat-photos', false)
on conflict (id) do update set public = false;

-- Avatare und Feed-Fotos bleiben bewusst öffentlich: sie werden ohnehin
-- überall in der App angezeigt, und signierte URLs würden dort nur
-- unnötige Roundtrips erzeugen.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('feed-photos', 'feed-photos', true)
on conflict (id) do nothing;

-- ── 2. Alte Policies entfernen ──────────────────────────────────────────
do $$
declare
  pol record;
begin
  for pol in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname like 'oikos_%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- ── 3. avatars ──────────────────────────────────────────────────────────
create policy "oikos_avatars_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "oikos_avatars_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "oikos_avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Vorher durfte jeder Angemeldete jeden Avatar löschen.
create policy "oikos_avatars_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. feed-photos ──────────────────────────────────────────────────────
create policy "oikos_feed_read" on storage.objects
  for select to public
  using (bucket_id = 'feed-photos');

create policy "oikos_feed_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "oikos_feed_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feed-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 5. chat-photos ──────────────────────────────────────────────────────
-- Lesen nur für Mitglieder der jeweiligen Konversation. Der erste
-- Pfad-Abschnitt ist die conversation_id, der zweite der Absender.
create policy "oikos_chat_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-photos'
    and exists (
      select 1
        from public.conversation_members cm
       where cm.user_id = auth.uid()
         and cm.conversation_id::text = (storage.foldername(name))[1]
    )
  );

create policy "oikos_chat_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1
        from public.conversation_members cm
       where cm.user_id = auth.uid()
         and cm.conversation_id::text = (storage.foldername(name))[1]
    )
  );

-- Löschen darf der Absender – und der Empfänger, damit „einmal ansehen"
-- die Datei tatsächlich entfernen kann (siehe useChat.markPhotoViewed).
create policy "oikos_chat_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-photos'
    and exists (
      select 1
        from public.conversation_members cm
       where cm.user_id = auth.uid()
         and cm.conversation_id::text = (storage.foldername(name))[1]
    )
  );

-- ── 6. community-banners ────────────────────────────────────────────────
create policy "oikos_banner_read" on storage.objects
  for select to public
  using (bucket_id = 'community-banners');

-- Nur Admins der jeweiligen Community dürfen deren Banner ändern.
create policy "oikos_banner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-banners'
    and exists (
      select 1
        from public.community_members cm
       where cm.user_id = auth.uid()
         and cm.role = 'admin'
         and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

create policy "oikos_banner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'community-banners'
    and exists (
      select 1
        from public.community_members cm
       where cm.user_id = auth.uid()
         and cm.role = 'admin'
         and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

create policy "oikos_banner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-banners'
    and exists (
      select 1
        from public.community_members cm
       where cm.user_id = auth.uid()
         and cm.role = 'admin'
         and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

-- ── 7. Kontrolle ────────────────────────────────────────────────────────
-- chat-photos muss public = false sein:
select id, public from storage.buckets order by id;
