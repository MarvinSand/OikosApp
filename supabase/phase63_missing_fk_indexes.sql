-- Phase 63: Fehlende Indizes auf Foreign-Key-Spalten
--
-- Supabase Performance Advisor meldete 83x "unindexed_foreign_keys". Ein
-- großer Teil davon sind genau die Spalten, über die die Hooks beim
-- App-Start/Navigieren filtern und joinen (community_members.user_id,
-- conversation_members.user_id, messages.sender_id, friendships.addressee_id,
-- personal_prayer_requests.owner_id, personal_prayer_logs.user_id,
-- world_map_activities.author_id, prayer_notes.author_id, ...) – bisher als
-- Sequential Scan statt Index-Lookup.
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_personal_prayer_requests_owner_id ON public.personal_prayer_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_personal_prayer_logs_user_id ON public.personal_prayer_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_world_map_activities_author_id ON public.world_map_activities(author_id);
CREATE INDEX IF NOT EXISTS idx_prayer_notes_author_id ON public.prayer_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_conversations_community_id ON public.conversations(community_id);
CREATE INDEX IF NOT EXISTS idx_conversations_activity_id ON public.conversations(activity_id);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON public.communities(created_by);
CREATE INDEX IF NOT EXISTS idx_world_map_activities_conversation_id ON public.world_map_activities(conversation_id);
CREATE INDEX IF NOT EXISTS idx_prayer_goals_personal_prayer_request_id ON public.prayer_goals(personal_prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_goals_prayer_request_id ON public.prayer_goals(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_personal_prayer_requests_category_id ON public.personal_prayer_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from_id ON public.messages(forwarded_from_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned_by ON public.messages(pinned_by);
