-- Phase 65: Weltkarte – granulare Standort-Präzision pro Zielgruppe
--
-- Ersetzt die nie ans Frontend angebundene Einzelspalte `location_precision`
-- (phase17b) durch zwei unabhängige Spalten, da Sichtbarkeit jetzt getrennt
-- für "alle Nutzer" und "Freunde" konfigurierbar sein muss. Erweitert
-- gleichzeitig den Sichtbarkeitskreis der Weltkarte von "nur Freunde" auf
-- "alle Nutzer mit show_on_world_map = true", vorbehaltlich der neuen
-- Präzisions-Einstellung (hidden = für diese Zielgruppe unsichtbar).

alter table public.profiles
  drop column if exists location_precision;

alter table public.profiles
  add column if not exists location_precision_public text not null default 'city'
    check (location_precision_public in ('hidden', 'city', 'district', 'exact')),
  add column if not exists location_precision_friends text not null default 'exact'
    check (location_precision_friends in ('hidden', 'city', 'district', 'exact'));

-- RPC: serverseitige Sichtbarkeits-/Präzisionslogik für die Weltkarte.
-- security definer, weil "Profile öffentlich lesen" (RLS, qual=true) zwar
-- jede Zeile technisch lesbar macht, aber NICHT die Präzisions-Reduktion
-- (gerundete Koordinaten, ausgeblendete Adressfelder) durchsetzt – das
-- übernimmt ausschließlich diese Funktion. Der reguläre App-Pfad
-- (useWorldMap.js) nutzt ausschließlich diese RPC statt eines direkten
-- profiles-Selects für fremde Nutzer.
create or replace function public.get_world_map_users()
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  latitude float,
  longitude float,
  is_christian boolean,
  gender text,
  city text,
  country text,
  church_name text,
  bio text,
  bio_text text,
  show_bio boolean,
  address_district text,
  address_full text,
  shown_precision text
)
language sql
stable
security definer
set search_path = public
as $$
  with my_friends as (
    select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'accepted'
      and (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
  ),
  scoped as (
    select
      p.*,
      coalesce(
        case when p.id in (select friend_id from my_friends)
          then p.location_precision_friends
          else p.location_precision_public
        end,
        'hidden'
      ) as prec
    from public.profiles p
    where p.id <> (select auth.uid())
      and p.show_on_world_map = true
      and p.latitude is not null
      and p.longitude is not null
  )
  select
    s.id, s.full_name, s.username, s.avatar_url,
    case s.prec
      when 'exact'    then s.latitude
      when 'district' then round(s.latitude::numeric, 3)::float
      else                 round(s.latitude::numeric, 2)::float
    end as latitude,
    case s.prec
      when 'exact'    then s.longitude
      when 'district' then round(s.longitude::numeric, 3)::float
      else                 round(s.longitude::numeric, 2)::float
    end as longitude,
    s.is_christian, s.gender,
    s.city, s.country, s.church_name,
    s.bio, s.bio_text, s.show_bio,
    case when s.prec in ('district', 'exact') then s.address_district else null end as address_district,
    case when s.prec = 'exact' then s.address_full else null end as address_full,
    s.prec as shown_precision
  from scoped s
  where s.prec <> 'hidden';
$$;

-- Supabase grantet EXECUTE auf neue Functions im public-Schema per Default
-- Privileges automatisch an anon+authenticated – hier explizit von anon
-- entziehen, da diese Funktion personenbezogene Standortdaten liefert und
-- nur eingeloggte Nutzer sie aufrufen dürfen sollen.
revoke execute on function public.get_world_map_users() from public;
revoke execute on function public.get_world_map_users() from anon;
grant execute on function public.get_world_map_users() to authenticated;
