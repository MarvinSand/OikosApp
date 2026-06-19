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
