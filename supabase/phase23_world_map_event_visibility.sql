-- Phase 23: Weltkarte-Events – Sichtbarkeit (Öffentlich / Geschwister / Gemeinde)
--
-- Erweitert world_map_activities um eine differenzierte Sichtbarkeit:
--   visibility = 'public'    → für alle OIKOS-Nutzer sichtbar
--   visibility = 'friends'   → nur für bestätigte Freunde (Geschwister) des Autors
--   visibility = 'community' → nur für Mitglieder der gewählten Gemeinde (community_id)
--
-- Idempotent – kann mehrfach ausgeführt werden.

alter table public.world_map_activities
  add column if not exists visibility text not null default 'public',
  add column if not exists community_id uuid references public.communities(id) on delete set null;

-- Bestehende Datensätze migrieren: is_public=false → 'friends'
update public.world_map_activities
  set visibility = case when is_public then 'public' else 'friends' end
  where visibility is null or visibility = 'public' and is_public = false;

-- ─── RLS: Lesepolicies für die drei Sichtbarkeiten ───────────────────────────

-- Geschwister (Freunde) dürfen 'friends'-Events lesen
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'world_map_activities' and policyname = 'Friends activities readable'
  ) then
    create policy "Friends activities readable"
      on public.world_map_activities for select
      using (
        visibility = 'friends'
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = auth.uid() and f.addressee_id = world_map_activities.author_id)
              or (f.addressee_id = auth.uid() and f.requester_id = world_map_activities.author_id)
            )
        )
      );
  end if;
end $$;

-- Gemeinde-Mitglieder dürfen 'community'-Events lesen
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'world_map_activities' and policyname = 'Community activities readable'
  ) then
    create policy "Community activities readable"
      on public.world_map_activities for select
      using (
        visibility = 'community'
        and community_id is not null
        and exists (
          select 1 from public.community_members cm
          where cm.community_id = world_map_activities.community_id
            and cm.user_id = auth.uid()
        )
      );
  end if;
end $$;
