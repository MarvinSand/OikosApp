-- Phase 67: Oikos-Personen bekommen einen Standort + granulare Sichtbarkeit,
-- damit "Oikos Verbindungen" (Pins + Beziehungslinien) auf der Weltkarte
-- angezeigt werden können.
--
-- Sicherheitshinweis: Die bestehenden RLS-Policies auf oikos_maps/oikos_people/
-- oikos_connections prüfen nur `visibility <> 'private'` – die feingranulare
-- visibility_user_ids/visibility_community_id-Logik wird dort NICHT durchgesetzt
-- (nur beim Schreiben gesetzt, nie beim Lesen gefiltert). Für dieses Feature ist
-- das nicht akzeptabel, da es echte Standortdaten offenlegt. Die neuen RPCs
-- implementieren die Sichtbarkeitsprüfung deshalb vollständig selbst
-- (security definer), unabhängig von der bestehenden RLS. Die generelle
-- RLS-Lücke selbst wird hier bewusst NICHT repariert (out of scope).

alter table public.oikos_people
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_address text,
  add column if not exists location_street text,
  add column if not exists location_district text,
  add column if not exists location_city text,
  add column if not exists location_country text,
  add column if not exists location_visibility text not null default 'private'
    check (location_visibility in ('private', 'all_siblings', 'specific_include', 'map_visibility')),
  add column if not exists location_visibility_user_ids uuid[] not null default '{}',
  add column if not exists oikos_connect_enabled boolean not null default false;

-- ── is_map_visible_to: korrekte serverseitige Umsetzung der Map-Sichtbarkeit
-- (die RLS heute nicht leistet). Owner sieht immer; sonst je nach
-- oikos_maps.visibility gegen Freundschaft/spezifische Liste/Community prüfen.
create or replace function public.is_map_visible_to(p_map_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when m.user_id = p_viewer_id then true
    when m.visibility = 'private' then false
    when m.visibility = 'all_siblings' then exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and ((f.requester_id = m.user_id and f.addressee_id = p_viewer_id)
          or (f.addressee_id = m.user_id and f.requester_id = p_viewer_id))
    )
    when m.visibility = 'specific_include' then p_viewer_id = any(m.visibility_user_ids)
    when m.visibility = 'specific_exclude' then
      exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and ((f.requester_id = m.user_id and f.addressee_id = p_viewer_id)
            or (f.addressee_id = m.user_id and f.requester_id = p_viewer_id))
      )
      and not (p_viewer_id = any(m.visibility_user_ids))
    when m.visibility = 'community' then exists (
      select 1 from community_members cm
      where cm.community_id = m.visibility_community_id and cm.user_id = p_viewer_id
    )
    else false
  end
  from oikos_maps m
  where m.id = p_map_id;
$$;

-- ── get_oikos_map_people_locations: Personen mit zugewiesenem, freigegebenem
-- Standort in den übergebenen Maps. Keine notes im Rückgabewert (bewusst
-- restriktiv – kein separates Notes-Sichtbarkeitsfeld vorhanden).
create or replace function public.get_oikos_map_people_locations(p_map_ids uuid[])
returns table (
  person_id uuid,
  map_id uuid,
  name text,
  lat double precision,
  lng double precision,
  address text,
  relationship_type text,
  linked_user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.map_id, p.name, p.location_lat, p.location_lng, p.location_address,
    p.relationship_type, p.linked_user_id
  from oikos_people p
  join oikos_maps m on m.id = p.map_id
  where p.map_id = any(p_map_ids)
    and p.oikos_connect_enabled = true
    and p.location_lat is not null
    and p.location_lng is not null
    and public.is_map_visible_to(p.map_id, (select auth.uid()))
    and (
      case p.location_visibility
        when 'private' then p.user_id = (select auth.uid())
        when 'all_siblings' then exists (
          select 1 from friendships f
          where f.status = 'accepted'
            and ((f.requester_id = m.user_id and f.addressee_id = (select auth.uid()))
              or (f.addressee_id = m.user_id and f.requester_id = (select auth.uid())))
        )
        when 'specific_include' then (select auth.uid()) = any(p.location_visibility_user_ids)
        when 'map_visibility' then true
        else false
      end
    );
$$;

-- ── get_oikos_map_connections: Beziehungs-Kanten der übergebenen Maps,
-- gated durch dieselbe Map-Sichtbarkeitsprüfung (Kantenstruktur selbst trägt
-- keine Standortdaten, wird aber trotzdem konsistent gegated statt sich auf
-- die löchrige RLS zu verlassen).
create or replace function public.get_oikos_map_connections(p_map_ids uuid[])
returns table (
  source_person_id uuid,
  target_person_id uuid,
  label text,
  color text,
  map_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select c.source_person_id, c.target_person_id, c.label, c.color, c.map_id
  from oikos_connections c
  where c.map_id = any(p_map_ids)
    and public.is_map_visible_to(c.map_id, (select auth.uid()));
$$;

-- Supabase grantet EXECUTE auf neue Functions im public-Schema per Default
-- Privileges automatisch an anon+authenticated – hier explizit von anon
-- entziehen, da diese Functions personenbezogene Standort-/Beziehungsdaten
-- liefern und nur eingeloggte Nutzer sie aufrufen dürfen sollen.
revoke execute on function public.is_map_visible_to(uuid, uuid) from public;
revoke execute on function public.is_map_visible_to(uuid, uuid) from anon;
grant execute on function public.is_map_visible_to(uuid, uuid) to authenticated;

revoke execute on function public.get_oikos_map_people_locations(uuid[]) from public;
revoke execute on function public.get_oikos_map_people_locations(uuid[]) from anon;
grant execute on function public.get_oikos_map_people_locations(uuid[]) to authenticated;

revoke execute on function public.get_oikos_map_connections(uuid[]) from public;
revoke execute on function public.get_oikos_map_connections(uuid[]) from anon;
grant execute on function public.get_oikos_map_connections(uuid[]) to authenticated;
