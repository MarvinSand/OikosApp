-- phase75: Automatische Oikos-Map "Meine Geschwister in Christus"
--
-- Problem: Es gab keine Übersicht über das eigene Beziehungsnetz (Freunde, ob sie
--   untereinander verbunden sind, Freunde von Freunden).
-- Lösung:
--   * oikos_maps.kind = 'siblings' markiert die System-Map (genau eine pro Account,
--     angelegt per Trigger auf profiles + Backfill).
--   * sync_siblings_map(): spiegelt akzeptierte Freundschaften als oikos_people
--     (linked_user_id) in diese Map. Positionen (pos_x/pos_y) bleiben erhalten.
--   * get_siblings_network(depth): Knoten (Generation 1..3) + Kanten zwischen den
--     Knoten. Die friendships-RLS zeigt nur eigene Zeilen, daher SECURITY DEFINER.
--     Blockierte (is_blocked_pair) werden immer ausgeblendet.
--   * notify_on_oikos_entry überspringt die System-Map (sonst Benachrichtigungs-Spam
--     bei jedem Sync).
-- Idempotent – im Supabase SQL-Editor mehrfach ausführbar.

-- ── 1. Spalte + Indizes ────────────────────────────────────────────────────
alter table public.oikos_maps add column if not exists kind text;

create unique index if not exists oikos_maps_one_siblings_per_user
  on public.oikos_maps (user_id) where kind = 'siblings';

create index if not exists oikos_people_map_linked_user_idx
  on public.oikos_people (map_id, linked_user_id);

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

-- ── 2. Map anlegen ─────────────────────────────────────────────────────────
create or replace function public.ensure_siblings_map(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.oikos_maps (user_id, name, visibility, kind)
  values (p_user, 'Meine Geschwister in Christus', 'private', 'siblings')
  on conflict (user_id) where kind = 'siblings' do nothing;

  select id into v_id from public.oikos_maps
   where user_id = p_user and kind = 'siblings';
  return v_id;
end;
$$;

revoke execute on function public.ensure_siblings_map(uuid) from public, anon, authenticated;

create or replace function public.trg_create_siblings_map()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_siblings_map(new.id);
  return new;
end;
$$;

revoke execute on function public.trg_create_siblings_map() from public, anon, authenticated;

drop trigger if exists trg_create_siblings_map on public.profiles;
create trigger trg_create_siblings_map
  after insert on public.profiles
  for each row execute function public.trg_create_siblings_map();

-- Backfill für bestehende Accounts
insert into public.oikos_maps (user_id, name, visibility, kind)
select p.id, 'Meine Geschwister in Christus', 'private', 'siblings'
  from public.profiles p
on conflict (user_id) where kind = 'siblings' do nothing;

-- ── 3. Keine "hat jemanden hinzugefügt"-Benachrichtigung für die System-Map ──
create or replace function public.notify_on_oikos_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_map_owner_id uuid;
  v_kind         text;
  v_owner_name   text;
begin
  select om.user_id, om.kind into v_map_owner_id, v_kind
    from oikos_maps om where om.id = new.map_id;

  if v_map_owner_id is null or v_kind = 'siblings' then return new; end if;

  select full_name into v_owner_name
    from profiles where id = v_map_owner_id;

  insert into notifications (user_id, type, title, body, data)
  select
    np.user_id,
    'oikos_entry',
    coalesce(v_owner_name, 'Jemand') || ' hat jemanden hinzugefügt 🗺',
    '„' || new.name || '" wurde zur OIKOS-Map hinzugefügt',
    jsonb_build_object('map_id', new.map_id, 'person_id', new.id, 'map_owner_id', v_map_owner_id)
  from notification_preferences np
  where np.target_user_id = v_map_owner_id
    and np.notify_oikos_entries = true
    and np.user_id <> v_map_owner_id;

  return new;
end;
$$;

-- ── 4. Hilfsfunktion: akzeptierte Verbindungen eines Users ───────────────────
create or replace function public._friend_ids(p_user uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select addressee_id from public.friendships
   where requester_id = p_user and status = 'accepted'
  union
  select requester_id from public.friendships
   where addressee_id = p_user and status = 'accepted';
$$;

revoke execute on function public._friend_ids(uuid) from public, anon, authenticated;

-- ── 5. Sync: Freunde → oikos_people der System-Map ───────────────────────────
create or replace function public.sync_siblings_map()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_map uuid;
begin
  if v_uid is null then return null; end if;

  v_map := public.ensure_siblings_map(v_uid);

  -- Entfernte / blockierte Verbindungen aus der Map nehmen
  delete from public.oikos_people op
   where op.map_id = v_map
     and op.linked_user_id is not null
     and (
       op.linked_user_id not in (select public._friend_ids(v_uid))
       or public.is_blocked_pair(op.linked_user_id)
     );

  -- Neue Verbindungen hinzufügen (Position bleibt NULL → Auto-Layout im Client)
  insert into public.oikos_people (map_id, user_id, name, linked_user_id, is_christian)
  select v_map, v_uid,
         coalesce(nullif(p.full_name, ''), p.username, 'Unbekannt'),
         p.id,
         coalesce(p.is_christian, false)
    from public.profiles p
   where p.id in (select public._friend_ids(v_uid))
     and not public.is_blocked_pair(p.id)
     and not exists (
       select 1 from public.oikos_people x
        where x.map_id = v_map and x.linked_user_id = p.id
     );

  -- Namen aktuell halten
  update public.oikos_people op
     set name = coalesce(nullif(p.full_name, ''), p.username, op.name),
         is_christian = coalesce(p.is_christian, false)
    from public.profiles p
   where op.map_id = v_map
     and op.linked_user_id = p.id
     and (op.name is distinct from coalesce(nullif(p.full_name, ''), p.username, op.name)
          or op.is_christian is distinct from coalesce(p.is_christian, false));

  return v_map;
end;
$$;

revoke execute on function public.sync_siblings_map() from public, anon;
grant execute on function public.sync_siblings_map() to authenticated;

-- ── 6. Netzwerk: Knoten (Generation 1..3) + Kanten zwischen den Knoten ────────
create or replace function public.get_siblings_network(p_depth int default 2)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_depth int  := greatest(1, least(coalesce(p_depth, 2), 3));
  v_g1    uuid[] := '{}';
  v_g2    uuid[] := '{}';
  v_g3    uuid[] := '{}';
  v_all   uuid[];
  v_nodes jsonb;
  v_edges jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb);
  end if;

  select coalesce(array_agg(f), '{}') into v_g1 from (
    select distinct fid as f from public._friend_ids(v_uid) fid
     where not public.is_blocked_pair(fid)
  ) s;

  if v_depth >= 2 then
    select coalesce(array_agg(f), '{}') into v_g2 from (
      select distinct fid as f
        from unnest(v_g1) u(id), lateral public._friend_ids(u.id) fid
       where fid <> v_uid and not (fid = any(v_g1))
         and not public.is_blocked_pair(fid)
       order by 1 limit 150
    ) s;
  end if;

  if v_depth >= 3 then
    select coalesce(array_agg(f), '{}') into v_g3 from (
      select distinct fid as f
        from unnest(v_g2) u(id), lateral public._friend_ids(u.id) fid
       where fid <> v_uid and not (fid = any(v_g1)) and not (fid = any(v_g2))
         and not public.is_blocked_pair(fid)
       order by 1 limit 150
    ) s;
  end if;

  v_all := v_g1 || v_g2 || v_g3;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'full_name', p.full_name,
           'username', p.username,
           'avatar_url', p.avatar_url,
           'is_christian', coalesce(p.is_christian, false),
           'gen', n.gen,
           'parent_id', case when n.gen = 1 then null else (
             select pr from unnest(case when n.gen = 2 then v_g1 else v_g2 end) pr
              where exists (
                select 1 from public.friendships fr
                 where fr.status = 'accepted'
                   and ((fr.requester_id = pr and fr.addressee_id = n.id)
                     or (fr.requester_id = n.id and fr.addressee_id = pr)))
              order by pr limit 1) end
         )), '[]'::jsonb)
    into v_nodes
    from (
      select unnest(v_g1) as id, 1 as gen
      union all select unnest(v_g2), 2
      union all select unnest(v_g3), 3
    ) n
    join public.profiles p on p.id = n.id;

  -- Kanten nur zwischen Knoten (ohne mich – die Mittellinien zeichnet der Client)
  select coalesce(jsonb_agg(jsonb_build_object('a', e.a, 'b', e.b)), '[]'::jsonb)
    into v_edges
    from (
      select distinct least(requester_id, addressee_id) as a,
                      greatest(requester_id, addressee_id) as b
        from public.friendships
       where status = 'accepted'
         and requester_id = any(v_all) and addressee_id = any(v_all)
    ) e;

  return jsonb_build_object('nodes', v_nodes, 'edges', v_edges);
end;
$$;

revoke execute on function public.get_siblings_network(int) from public, anon;
grant execute on function public.get_siblings_network(int) to authenticated;
