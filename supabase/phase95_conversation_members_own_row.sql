-- Phase 95: Community-Chats – eigener Mitgliedseintrag war nie anlegbar
--
-- Problem: Der Client trägt sich beim Öffnen eines Community-Chats per
--   INSERT ... ON CONFLICT (conversation_id, user_id) DO UPDATE
-- in conversation_members ein (useCommunityDetail / useChat.markAsRead).
-- Bei ON CONFLICT DO UPDATE prüft Postgres die SELECT-Policy zusätzlich als
-- WITH CHECK gegen die NEUE Zeile. Die SELECT-Policy erlaubte aber nur Zeilen
-- aus Unterhaltungen, in denen man bereits Mitglied ist
-- (get_my_conversation_ids()) – beim allerersten Eintrag also nie.
-- Folge: jeder Upsert scheiterte mit 403 (RLS), live gab es 0 Mitgliedszeilen
-- für alle Community-Chats. Ohne Zeile kein last_read_at → Community-Chats
-- mit fremden Nachrichten galten dauerhaft als ungelesen (Badge auf Home).
--
-- Fix: Die eigene Mitgliedszeile darf man immer lesen. Das gibt keine neuen
-- Daten frei (es ist die eigene Zeile) und lässt den Upsert durch; ob man
-- überhaupt beitreten darf, entscheidet weiterhin die INSERT-Policy
-- (can_self_join_conversation).
--
-- ALTER statt DROP/CREATE: idempotent und ohne Lücke, in der keine Policy gilt.

ALTER POLICY "members can read conversation_members" ON public.conversation_members
  USING (
    user_id = (select auth.uid())
    OR conversation_id IN (SELECT public.get_my_conversation_ids())
  );
