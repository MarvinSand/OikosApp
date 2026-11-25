-- phase107: Mehrere Standorte pro Gemeinde/Hausgemeinde (gleiche Community, wechselnde Treffpunkte).
-- Der Haupt-Standort bleibt in communities (address/latitude/longitude/meeting_info);
-- weitere Treffpunkte stehen in community_locations. Idempotent.
create table if not exists public.community_locations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  label text,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  meeting_info text,
  created_at timestamptz not null default now()
);

create index if not exists community_locations_community_idx
  on public.community_locations (community_id);

alter table public.community_locations enable row level security;

-- Lesen: wer die Community lesen darf (öffentlich oder Mitglied) – die RLS von communities greift in der Unterabfrage
drop policy if exists "Standorte lesen" on public.community_locations;
create policy "Standorte lesen" on public.community_locations for select
  using (exists (select 1 from public.communities c where c.id = community_locations.community_id));

drop policy if exists "Standorte anlegen" on public.community_locations;
create policy "Standorte anlegen" on public.community_locations for insert
  with check (public.is_community_admin(community_id));

drop policy if exists "Standorte bearbeiten" on public.community_locations;
create policy "Standorte bearbeiten" on public.community_locations for update
  using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

drop policy if exists "Standorte löschen" on public.community_locations;
create policy "Standorte löschen" on public.community_locations for delete
  using (public.is_community_admin(community_id));
