-- phase100: weitere Highlight-Arten (Feed-/Community-Beiträge), Stadtmittelpunkt
-- für „nur Ort“-Sichtbarkeit auf der Weltkarte, Regions-Gruppen-Nachtrag durch
-- Admins und Rückgabe der Gruppen (für das „Du bist jetzt in …“-Pop-up).
-- Idempotent.

-- ─── 1. Highlights: Feed-Beiträge + Community-Beiträge ───────────────────
alter table public.home_highlights
  add column if not exists post_id uuid references public.feed_posts(id) on delete cascade,
  add column if not exists community_post_id uuid references public.community_posts(id) on delete cascade;

alter table public.home_highlights drop constraint if exists home_highlights_kind_check;
alter table public.home_highlights add constraint home_highlights_kind_check
  check (kind in ('update', 'event', 'prayer', 'post', 'community_post'));

alter table public.home_highlights drop constraint if exists home_highlights_ref_check;
alter table public.home_highlights add constraint home_highlights_ref_check check (
  (kind = 'update' and nullif(trim(title), '') is not null)
  or (kind = 'event' and activity_id is not null)
  or (kind = 'prayer' and prayer_id is not null)
  or (kind = 'post' and post_id is not null)
  or (kind = 'community_post' and community_post_id is not null)
);

create index if not exists home_highlights_post_idx on public.home_highlights (post_id);
create index if not exists home_highlights_cpost_idx on public.home_highlights (community_post_id);

create or replace function public.get_home_highlights()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(x.j order by x.is_important desc, x.created_at desc), '[]'::jsonb)
  from (
    select h.is_important, h.created_at,
      case h.kind
        when 'update' then jsonb_build_object(
          'id', h.id, 'kind', 'update', 'title', h.title, 'body', h.body,
          'is_important', h.is_important, 'created_at', h.created_at)
        when 'event' then jsonb_build_object(
          'id', h.id, 'kind', 'event', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'activity_id', a.id, 'title', a.title,
          'emoji', a.activity_emoji, 'location_name', a.location_name,
          'starts_at', a.starts_at, 'ends_at', a.ends_at, 'description', a.description,
          'recurrence_freq', a.recurrence_freq, 'recurrence_interval', a.recurrence_interval,
          'recurrence_weekdays', a.recurrence_weekdays, 'recurrence_end_date', a.recurrence_end_date)
        when 'prayer' then jsonb_build_object(
          'id', h.id, 'kind', 'prayer', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'prayer_id', p.id, 'title', p.title,
          'description', p.description,
          'author_name', coalesce(nullif(pr.full_name, ''), pr.username))
        when 'post' then jsonb_build_object(
          'id', h.id, 'kind', 'post', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'post_id', fp.id, 'title', fp.title,
          'description', fp.body, 'photo_url', fp.photo_url,
          'author_name', coalesce(nullif(fpr.full_name, ''), fpr.username))
        when 'community_post' then jsonb_build_object(
          'id', h.id, 'kind', 'community_post', 'note', h.body, 'is_important', h.is_important,
          'created_at', h.created_at, 'community_post_id', cp.id, 'community_id', cc.id,
          'community_name', cc.name, 'title', cp.title, 'description', cp.content,
          'author_name', coalesce(nullif(cpr.full_name, ''), cpr.username))
      end as j
    from public.home_highlights h
    left join public.world_map_activities a
      on h.kind = 'event' and a.id = h.activity_id
         and a.is_public is true
         and (a.expires_at is null or a.expires_at > now())
         and not public.is_blocked_pair(a.author_id)
    left join public.personal_prayer_requests p
      on h.kind = 'prayer' and p.id = h.prayer_id
         and p.visibility = 'public'
         and p.moderation_hidden_at is null and p.moderation_deleted_at is null
         and not public.is_blocked_pair(p.owner_id)
    left join public.profiles pr on pr.id = p.owner_id
    left join public.feed_posts fp
      on h.kind = 'post' and fp.id = h.post_id
         and fp.is_public is true
         and fp.moderation_hidden_at is null and fp.moderation_deleted_at is null
         and not public.is_blocked_pair(fp.author_id)
    left join public.profiles fpr on fpr.id = fp.author_id
    left join public.community_posts cp
      on h.kind = 'community_post' and cp.id = h.community_post_id
         and cp.moderation_hidden_at is null and cp.moderation_deleted_at is null
         and not public.is_blocked_pair(cp.author_id)
    left join public.communities cc on cc.id = cp.community_id and cc.is_public is true
    left join public.profiles cpr on cpr.id = cp.author_id
    where (h.expires_at is null or h.expires_at > now())
      and (h.kind = 'update' or a.id is not null or p.id is not null
           or fp.id is not null or (cp.id is not null and cc.id is not null))
  ) x
  where x.j is not null;
$$;

revoke all on function public.get_home_highlights() from public, anon;
grant execute on function public.get_home_highlights() to authenticated;

-- ─── 2. Stadtmittelpunkt für „nur Ort“ auf der Weltkarte ─────────────────
-- Wer nur den Ort zeigt, steht exakt auf dem Mittelpunkt der Stadt (vom
-- Geocoder ermittelt) – alle aus demselben Ort liegen so übereinander und
-- werden auf der Karte zusammengefasst (Klick öffnet die Liste).
alter table public.profiles
  add column if not exists city_lat double precision,
  add column if not exists city_lng double precision;

create or replace function public.set_my_city_center(p_lat double precision, p_lng double precision)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update profiles set city_lat = p_lat, city_lng = p_lng
  where id = (select auth.uid()) and p_lat between -90 and 90 and p_lng between -180 and 180;
$$;

revoke all on function public.set_my_city_center(double precision, double precision) from public, anon;
grant execute on function public.set_my_city_center(double precision, double precision) to authenticated;

create or replace function public.get_world_map_users()
 returns table(id uuid, full_name text, username text, avatar_url text, latitude double precision, longitude double precision, is_christian boolean, gender text, city text, country text, church_name text, bio text, bio_text text, show_bio boolean, address_district text, address_full text, shown_precision text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
      and not public.is_blocked_pair(p.id)
  )
  select
    s.id, s.full_name, s.username, s.avatar_url,
    case s.prec when 'exact' then s.latitude when 'district' then round(s.latitude::numeric, 3)::float else coalesce(s.city_lat, round(s.latitude::numeric, 2)::float) end as latitude,
    case s.prec when 'exact' then s.longitude when 'district' then round(s.longitude::numeric, 3)::float else coalesce(s.city_lng, round(s.longitude::numeric, 2)::float) end as longitude,
    s.is_christian, s.gender, s.city, s.country, s.church_name, s.bio, s.bio_text, s.show_bio,
    case when s.prec in ('district', 'exact') then s.address_district else null end as address_district,
    case when s.prec = 'exact' then s.address_full else null end as address_full,
    s.prec as shown_precision
  from scoped s
  where s.prec <> 'hidden';
$function$;

-- ─── 3. Regions-Gruppen: gemeinsame Logik, Admin-Nachtrag, Rückgabe ──────
create or replace function public._join_region_groups_for(
  p_uid uuid, p_country text, p_country_code text, p_state text, p_state_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cc text := upper(nullif(trim(coalesce(p_country_code, '')), ''));
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_state text := nullif(trim(coalesce(p_state, '')), '');
  v_scode text := upper(nullif(trim(coalesce(p_state_code, '')), ''));
  v_show boolean;
  v_flag text := '';
  v_keys text[] := '{}';
  v_ids uuid[] := '{}';
  v_gid uuid;
  v_conv uuid;
  v_member uuid;
  v_groups jsonb := '[]'::jsonb;
  v_name text;
begin
  if p_uid is null then raise exception 'Nicht angemeldet'; end if;
  if v_cc is null or v_country is null then
    return jsonb_build_object('joined', '[]'::jsonb, 'groups', '[]'::jsonb);
  end if;

  update profiles set address_state = v_state, country_code = v_cc where id = p_uid;

  select coalesce(show_on_world_map, false) into v_show from profiles where id = p_uid;
  if not coalesce(v_show, false) then
    return jsonb_build_object('joined', '[]'::jsonb, 'groups', '[]'::jsonb, 'skipped', 'not_on_map');
  end if;

  if v_cc ~ '^[A-Z]{2}$' then
    v_flag := chr(127397 + ascii(substr(v_cc, 1, 1))) || chr(127397 + ascii(substr(v_cc, 2, 1))) || ' ';
  end if;

  v_gid := _ensure_region_group('country:' || v_cc, v_flag || v_country,
    'Austausch der Geschwister aus ' || v_country || '. Diese Gruppe entsteht automatisch, wenn du dich mit Standort auf der Weltkarte einträgst.');
  v_keys := v_keys || ('country:' || v_cc);
  v_ids := v_ids || v_gid;

  if v_state is not null then
    v_gid := _ensure_region_group('state:' || v_cc || ':' || coalesce(v_scode, lower(v_state)), v_state,
      'Austausch der Geschwister aus ' || v_state || ' (' || v_country || '). Diese Gruppe entsteht automatisch, wenn du dich mit Standort auf der Weltkarte einträgst.');
    v_keys := v_keys || ('state:' || v_cc || ':' || coalesce(v_scode, lower(v_state)));
    v_ids := v_ids || v_gid;
  end if;

  -- Alte automatische Regions-Gruppen verlassen (Umzug)
  delete from conversation_members cm
  using conversations c, communities co
  where cm.user_id = p_uid and cm.conversation_id = c.id and c.type = 'community'
    and c.community_id = co.id and co.region_key is not null and not (co.region_key = any (v_keys));
  delete from community_members m
  using communities co
  where m.user_id = p_uid and m.community_id = co.id
    and co.region_key is not null and not (co.region_key = any (v_keys));

  foreach v_gid in array v_ids loop
    v_member := null;
    insert into community_members (community_id, user_id, role)
    values (v_gid, p_uid, 'member')
    on conflict (community_id, user_id) do nothing
    returning id into v_member;

    select id into v_conv from conversations where type = 'community' and community_id = v_gid limit 1;
    if v_conv is not null then
      insert into conversation_members (conversation_id, user_id, last_read_at)
      values (v_conv, p_uid, now())
      on conflict (conversation_id, user_id) do nothing;
    end if;

    select name into v_name from communities where id = v_gid;
    v_groups := v_groups || jsonb_build_array(jsonb_build_object(
      'id', v_gid, 'name', v_name, 'is_new', v_member is not null));
  end loop;

  return jsonb_build_object('joined', to_jsonb(v_ids), 'groups', v_groups);
end;
$$;

revoke all on function public._join_region_groups_for(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.join_region_groups(
  p_country text, p_country_code text, p_state text, p_state_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  return public._join_region_groups_for(auth.uid(), p_country, p_country_code, p_state, p_state_code);
end;
$$;

revoke all on function public.join_region_groups(text, text, text, text) from public, anon;
grant execute on function public.join_region_groups(text, text, text, text) to authenticated;

-- Nachtrag für bestehende Nutzer durch einen App-Admin: dessen Gerät ermittelt
-- Land/Bundesland/Stadtmitte der sichtbaren Nutzer und trägt sie hier ein.
create or replace function public.admin_users_missing_region(p_ids uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select array_agg(p.id) from profiles p
    where p.id = any (p_ids)
      and p.show_on_world_map = true and p.latitude is not null
      and (p.city_lat is null or not exists (
        select 1 from community_members m join communities c on c.id = m.community_id
        where m.user_id = p.id and c.region_key is not null))
  ), '{}');
end;
$$;

revoke all on function public.admin_users_missing_region(uuid[]) from public, anon;
grant execute on function public.admin_users_missing_region(uuid[]) to authenticated;

create or replace function public.admin_apply_user_region(
  p_user uuid, p_country text, p_country_code text, p_state text, p_state_code text,
  p_city_lat double precision, p_city_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_city_lat between -90 and 90 and p_city_lng between -180 and 180 then
    update profiles set city_lat = p_city_lat, city_lng = p_city_lng where id = p_user;
  end if;
  return public._join_region_groups_for(p_user, p_country, p_country_code, p_state, p_state_code);
end;
$$;

revoke all on function public.admin_apply_user_region(uuid, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.admin_apply_user_region(uuid, text, text, text, text, double precision, double precision) to authenticated;

create or replace function public.get_my_region_status()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'country_code', p.country_code,
    'state', p.address_state,
    'has_city_center', p.city_lat is not null,
    'has_groups', exists (
      select 1 from community_members m join communities c on c.id = m.community_id
      where m.user_id = p.id and c.region_key is not null)
  )
  from profiles p where p.id = (select auth.uid());
$$;
