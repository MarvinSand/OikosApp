-- phase76: Systemkarte „Meine Geschwister in Christus" – öffentlich + Freunde wirklich in der Map
--
-- Problem: phase75 hatte `sync_siblings_map` mit DELETE – die Funktion wurde live nie angelegt,
--   dadurch blieb die Karte leer (nur der eigene Name). Außerdem soll die Karte für alle sichtbar sein.
-- Lösung:
--   * neuer Sichtbarkeitswert 'public' (Check-Constraint, is_map_visible_to, ensure_siblings_map)
--   * _sync_siblings_for(user): fügt akzeptierte Freunde als oikos_people ein (nur INSERT)
--   * sync_siblings_map(): ruft das auf und liefert {map_id, stale_person_ids}; der Client löscht
--     Personen entfernter/blockierter Freunde (RLS erlaubt dem Besitzer das Löschen)
--   * Trigger auf friendships: neue Freundschaft landet sofort in beiden Karten
--   * get_user_siblings_network(user, depth): Netz für einen beliebigen Besitzer (öffentliche Ansicht),
--     Blocks relativ zum Betrachter (is_blocked_pair nutzt auth.uid())
-- Idempotent. Hinweis: den Trigger ggf. separat von DROP TRIGGER ausführen (Supabase-MCP-Timeout).

-- 1. 'public' erlauben
alter table public.oikos_maps drop constraint if exists oikos_maps_visibility_check;
alter table public.oikos_maps add constraint oikos_maps_visibility_check
  check (visibility = any (array['private','all_siblings','specific_include','specific_exclude','community','public']));

create or replace function public.ensure_siblings_map(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.oikos_maps (user_id, name, visibility, kind)
  values (p_user, 'Meine Geschwister in Christus', 'public', 'siblings')
  on conflict (user_id) where kind = 'siblings' do nothing;
  select id into v_id from public.oikos_maps where user_id = p_user and kind = 'siblings';
  return v_id;
end; $$;

update public.oikos_maps set visibility = 'public' where kind = 'siblings' and visibility <> 'public';

create or replace function public.is_map_visible_to(p_map_id uuid, p_viewer_id uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select case
    when m.user_id = p_viewer_id then true
    when m.visibility = 'private' then false
    when m.visibility = 'public' then true
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
$function$;

-- 2. Freunde in die Karte spiegeln (nur INSERT)
create or replace function public._sync_siblings_for(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_map uuid;
begin
  v_map := public.ensure_siblings_map(p_user);
  insert into public.oikos_people (map_id, user_id, name, linked_user_id, is_christian)
  select v_map, p_user, coalesce(nullif(p.full_name, ''), p.username, 'Unbekannt'), p.id, coalesce(p.is_christian, false)
    from public.profiles p
   where p.id in (select public._friend_ids(p_user))
     and not exists (select 1 from public.oikos_people x where x.map_id = v_map and x.linked_user_id = p.id);
  return v_map;
end; $$;
revoke execute on function public._sync_siblings_for(uuid) from public, anon, authenticated;

create or replace function public.sync_siblings_map()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_map uuid;
  v_stale jsonb;
begin
  if v_uid is null then return null; end if;
  v_map := public._sync_siblings_for(v_uid);

  select coalesce(jsonb_agg(op.id), '[]'::jsonb) into v_stale
    from public.oikos_people op
   where op.map_id = v_map and op.linked_user_id is not null
     and (op.linked_user_id not in (select public._friend_ids(v_uid))
          or public.is_blocked_pair(op.linked_user_id));

  update public.oikos_people op
     set name = coalesce(nullif(p.full_name, ''), p.username, op.name),
         is_christian = coalesce(p.is_christian, false)
    from public.profiles p
   where op.map_id = v_map and op.linked_user_id = p.id
     and (op.name is distinct from coalesce(nullif(p.full_name, ''), p.username, op.name)
          or op.is_christian is distinct from coalesce(p.is_christian, false));

  return jsonb_build_object('map_id', v_map, 'stale_person_ids', v_stale);
end; $$;
revoke execute on function public.sync_siblings_map() from public, anon;
grant execute on function public.sync_siblings_map() to authenticated;

-- Backfill
select public._sync_siblings_for(id) from public.profiles;

-- 3. Neue Freundschaft → beide Karten sofort aktualisieren
create or replace function public.trg_friendship_sync_siblings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' then
    perform public._sync_siblings_for(new.requester_id);
    perform public._sync_siblings_for(new.addressee_id);
  end if;
  return new;
end; $$;
revoke execute on function public.trg_friendship_sync_siblings() from public, anon, authenticated;

drop trigger if exists trg_friendship_sync_siblings on public.friendships;
create trigger trg_friendship_sync_siblings after insert or update of status on public.friendships
  for each row execute function public.trg_friendship_sync_siblings();

-- 4. Netzwerk für einen beliebigen Besitzer (öffentliche Ansicht)
create or replace function public.get_user_siblings_network(p_user uuid, p_depth int default 2)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(p_user, (select auth.uid()));
  v_depth int := greatest(1, least(coalesce(p_depth, 2), 3));
  v_g1 uuid[] := '{}'; v_g2 uuid[] := '{}'; v_g3 uuid[] := '{}';
  v_all uuid[]; v_nodes jsonb; v_edges jsonb;
begin
  if (select auth.uid()) is null or v_uid is null then
    return jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb);
  end if;

  select coalesce(array_agg(f), '{}') into v_g1 from (
    select distinct fid as f from public._friend_ids(v_uid) fid where not public.is_blocked_pair(fid)) s;

  if v_depth >= 2 then
    select coalesce(array_agg(f), '{}') into v_g2 from (
      select distinct fid as f from unnest(v_g1) u(id), lateral public._friend_ids(u.id) fid
       where fid <> v_uid and not (fid = any(v_g1)) and not public.is_blocked_pair(fid)
       order by 1 limit 150) s;
  end if;

  if v_depth >= 3 then
    select coalesce(array_agg(f), '{}') into v_g3 from (
      select distinct fid as f from unnest(v_g2) u(id), lateral public._friend_ids(u.id) fid
       where fid <> v_uid and not (fid = any(v_g1)) and not (fid = any(v_g2)) and not public.is_blocked_pair(fid)
       order by 1 limit 150) s;
  end if;

  v_all := v_g1 || v_g2 || v_g3;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'full_name', p.full_name, 'username', p.username, 'avatar_url', p.avatar_url,
           'is_christian', coalesce(p.is_christian, false), 'gen', n.gen,
           'parent_id', case when n.gen = 1 then null else (
             select pr from unnest(case when n.gen = 2 then v_g1 else v_g2 end) pr
              where exists (select 1 from public.friendships fr where fr.status = 'accepted'
                 and ((fr.requester_id = pr and fr.addressee_id = n.id) or (fr.requester_id = n.id and fr.addressee_id = pr)))
              order by pr limit 1) end)), '[]'::jsonb)
    into v_nodes
    from (select unnest(v_g1) as id, 1 as gen union all select unnest(v_g2), 2 union all select unnest(v_g3), 3) n
    join public.profiles p on p.id = n.id;

  select coalesce(jsonb_agg(jsonb_build_object('a', e.a, 'b', e.b)), '[]'::jsonb) into v_edges
    from (select distinct least(requester_id, addressee_id) as a, greatest(requester_id, addressee_id) as b
            from public.friendships
           where status = 'accepted' and requester_id = any(v_all) and addressee_id = any(v_all)) e;

  return jsonb_build_object('nodes', v_nodes, 'edges', v_edges);
end; $$;
revoke execute on function public.get_user_siblings_network(uuid, int) from public, anon;
grant execute on function public.get_user_siblings_network(uuid, int) to authenticated;
