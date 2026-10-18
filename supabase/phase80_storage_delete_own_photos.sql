-- 20261018 storage_delete_own_photos: users may only delete their own uploads in feed-photos / chat-photos
DROP POLICY IF EXISTS "feed-photos delete" ON storage.objects;
CREATE POLICY "feed-photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feed-photos' AND owner_id = (select auth.uid())::text);
DROP POLICY IF EXISTS "chat-photos delete" ON storage.objects;
CREATE POLICY "chat-photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-photos' AND owner_id = (select auth.uid())::text);
