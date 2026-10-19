-- phase85: single-round-trip bootstrap RPCs for profile screens (Nano-friendly).
-- ONE migration to avoid PostgREST schema-reload storms.

-- ─── Other-user profile (header + relationship + tabs) ─────────
create or replace function public.get_other_user_profile_bootstrap(p_target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := (select auth.uid());
  v_profile jsonb;
  v_birthday date;
  v_friend record;
  v_friendship jsonb;
  v_blocked_by_me boolean;
  v_blocked_me boolean;
  v_prefs jsonb;
  v_conn_count int;
  v_communities jsonb;
  v_maps jsonb;
  v_posts jsonb;
  v_reposts jsonb;
  v_prayers jsonb;
  v_is_sibling boolean;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_target is null or p_target = v_me then
    raise exception 'invalid target' using errcode = '22023';
  end if;

  -- Public profile columns only (no address/coords/youversion_email/push)
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'bio_text', p.bio_text,
    'show_bio', p.show_bio,
    'is_christian', p.is_christian,
    'gender', p.gender,
    'created_at', p.created_at,
    'map_is_public', p.map_is_public,
    'discipleship_stage', p.discipleship_stage,
    'show_on_world_map', p.show_on_world_map,
    'has_location', p.has_location,
    'last_active_at', p.last_active_at,
    'show_last_active', p.show_last_active,
    'show_birthday', p.show_birthday,
    'church_name', p.church_name,
    'show_church', p.show_church,
    'city', p.city,
    'show_city', p.show_city,
    'country', p.country,
    'youversion_connected', p.youversion_connected
  )
  into v_profile
  from public.profiles p
  where p.id = p_target;

  if v_profile is null then
    return jsonb_build_object('profile', null);
  end if;

  -- Birthday only when show_birthday and not blocked (same as get_visible_birthdays)
  if (v_profile->>'show_birthday')::boolean is true
     and not public.is_blocked_pair(p_target) then
    select p.birthday into v_birthday
    from public.profiles p
    where p.id = p_target and p.birthday is not null;
  end if;

  -- Friendship both directions
  select f.id, f.status, f.requester_id, f.addressee_id
  into v_friend
  from public.friendships f
  where f.status <> 'declined'
    and (
      (f.requester_id = v_me and f.addressee_id = p_target)
      or (f.requester_id = p_target and f.addressee_id = v_me)
    )
  order by case f.status when 'accepted' then 0 when 'pending' then 1 else 2 end
  limit 1;

  if v_friend.id is null then
    v_friendship := jsonb_build_object('status', 'none', 'id', null);
    v_is_sibling := false;
  elsif v_friend.status = 'accepted' then
    v_friendship := jsonb_build_object('status', 'friends', 'id', v_friend.id);
    v_is_sibling := true;
  elsif v_friend.requester_id = v_me then
    v_friendship := jsonb_build_object('status', 'sent', 'id', v_friend.id);
    v_is_sibling := false;
  else
    v_friendship := jsonb_build_object('status', 'received', 'id', v_friend.id);
    v_is_sibling := false;
  end if;

  select exists(
    select 1 from public.user_blocks b
    where b.blocker_id = v_me and b.blocked_id = p_target
  ) into v_blocked_by_me;
  select exists(
    select 1 from public.user_blocks b
    where b.blocker_id = p_target and b.blocked_id = v_me
  ) into v_blocked_me;

  select to_jsonb(np) into v_prefs
  from public.notification_preferences np
  where np.user_id = v_me and np.target_user_id = p_target;

  select count(*)::int into v_conn_count
  from public.friendships f
  where f.status = 'accepted'
    and (f.requester_id = p_target or f.addressee_id = p_target);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'is_public', c.is_public
  ) order by c.name), '[]'::jsonb)
  into v_communities
  from public.community_members cm
  join public.communities c on c.id = cm.community_id
  where cm.user_id = p_target and c.is_public is true;

  -- Maps visible to viewer (same rules as is_map_visible_to / RLS)
  select coalesce(jsonb_agg(m.obj order by m.created_at), '[]'::jsonb)
  into v_maps
  from (
    select jsonb_build_object(
      'id', om.id,
      'user_id', om.user_id,
      'name', om.name,
      'kind', om.kind,
      'visibility', om.visibility,
      'visibility_user_ids', om.visibility_user_ids,
      'visibility_community_id', om.visibility_community_id,
      'created_at', om.created_at,
      'personCount', (
        select count(*)::int from public.oikos_people op where op.map_id = om.id
      )
    ) as obj,
    om.created_at
    from public.oikos_maps om
    where om.user_id = p_target
      and om.visibility <> 'private'
      and public.is_map_visible_to(om.id, v_me)
  ) m;

  -- Public posts by target (matches client .eq('is_public', true) for others)
  -- plus engagement summary to avoid N+1 reaction queries
  select coalesce(jsonb_agg(p.obj order by p.created_at desc), '[]'::jsonb)
  into v_posts
  from (
    select jsonb_build_object(
      'id', fp.id,
      'author_id', fp.author_id,
      'type', fp.type,
      'category', fp.category,
      'title', fp.title,
      'body', fp.body,
      'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference,
      'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id,
      'bible_book', fp.bible_book,
      'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start,
      'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public,
      'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids,
      'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count,
      'bookmark_count', fp.bookmark_count,
      'created_at', fp.created_at,
      'profiles', jsonb_build_object(
        'id', pr.id,
        'full_name', pr.full_name,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
        'is_christian', pr.is_christian
      ),
      'reactions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type
        )) from public.feed_reactions fr where fr.post_id = fp.id
      ), '[]'::jsonb),
      'commentCount', (
        select count(*)::int from public.feed_comments fc where fc.post_id = fp.id
      ),
      'reposts', coalesce((
        select jsonb_agg(jsonb_build_object(
          'post_id', r.post_id, 'user_id', r.user_id
        )) from public.feed_reposts r where r.post_id = fp.id
      ), '[]'::jsonb),
      'bookmarked', exists(
        select 1 from public.feed_bookmarks fb
        where fb.post_id = fp.id and fb.user_id = v_me
      )
    ) as obj,
    fp.created_at
    from public.feed_posts fp
    join public.profiles pr on pr.id = fp.author_id
    where fp.author_id = p_target
      and fp.is_public is true
      and not public.is_blocked_pair(fp.author_id)
    order by fp.created_at desc
    limit 50
  ) p;

  -- Reposts by target (posts they shared), with engagement
  select coalesce(jsonb_agg(x.obj order by x.repost_at desc), '[]'::jsonb)
  into v_reposts
  from (
    select jsonb_build_object(
      'id', fp.id,
      'author_id', fp.author_id,
      'type', fp.type,
      'category', fp.category,
      'title', fp.title,
      'body', fp.body,
      'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference,
      'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id,
      'bible_book', fp.bible_book,
      'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start,
      'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public,
      'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids,
      'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count,
      'bookmark_count', fp.bookmark_count,
      'created_at', fp.created_at,
      'profiles', jsonb_build_object(
        'id', pr.id,
        'full_name', pr.full_name,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
        'is_christian', pr.is_christian
      ),
      'reactions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type
        )) from public.feed_reactions fr where fr.post_id = fp.id
      ), '[]'::jsonb),
      'commentCount', (
        select count(*)::int from public.feed_comments fc where fc.post_id = fp.id
      ),
      'reposts', coalesce((
        select jsonb_agg(jsonb_build_object(
          'post_id', r.post_id, 'user_id', r.user_id
        )) from public.feed_reposts r where r.post_id = fp.id
      ), '[]'::jsonb),
      'bookmarked', exists(
        select 1 from public.feed_bookmarks fb
        where fb.post_id = fp.id and fb.user_id = v_me
      )
    ) as obj,
    frp.created_at as repost_at
    from public.feed_reposts frp
    join public.feed_posts fp on fp.id = frp.post_id
    join public.profiles pr on pr.id = fp.author_id
    where frp.user_id = p_target
      and not public.is_blocked_pair(fp.author_id)
      -- only posts the viewer could see via public flag (same as prior client path for others)
      and (fp.is_public is true or fp.author_id = v_me)
    order by frp.created_at desc
    limit 50
  ) x;

  -- Prayers: personal (RLS-equivalent) + public oikos prayer_requests
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  into v_prayers
  from (
    select jsonb_build_object(
      'id', ppr.id,
      'title', ppr.title,
      'description', ppr.description,
      'category', ppr.category,
      'is_answered', ppr.is_answered,
      'is_public', ppr.visibility <> 'private',
      'created_at', ppr.created_at,
      'source', 'personal'
    ) as obj,
    ppr.created_at
    from public.personal_prayer_requests ppr
    where ppr.owner_id = p_target
      and not public.is_blocked_pair(ppr.owner_id)
      and (
        ppr.visibility = 'public'
        or (
          ppr.visibility = 'siblings' and v_is_sibling
        )
        or (
          ppr.visibility = 'community'
          and exists (
            select 1 from public.community_members cm
            where cm.community_id = ppr.visibility_community_id and cm.user_id = v_me
          )
        )
        or (v_me = any (coalesce(ppr.visibility_user_ids, '{}'::uuid[])))
      )
    union all
    select jsonb_build_object(
      'id', pr.id,
      'title', pr.title,
      'description', pr.description,
      'category', null,
      'is_answered', pr.is_answered,
      'is_public', pr.is_public,
      'created_at', pr.created_at,
      'source', 'person'
    ),
    pr.created_at
    from public.prayer_requests pr
    where pr.owner_id = p_target
      and pr.is_public is true
  ) q;

  return jsonb_build_object(
    'profile', v_profile || jsonb_build_object('birthday', v_birthday),
    'friendship', v_friendship,
    'blocked_by_me', v_blocked_by_me,
    'blocked_me', v_blocked_me,
    'notif_prefs', v_prefs,
    'connections_count', v_conn_count,
    'public_communities', coalesce(v_communities, '[]'::jsonb),
    'maps', coalesce(v_maps, '[]'::jsonb),
    'posts', coalesce(v_posts, '[]'::jsonb),
    'reposts', coalesce(v_reposts, '[]'::jsonb),
    'prayer_requests', coalesce(v_prayers, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_other_user_profile_bootstrap(uuid) from public, anon;
grant execute on function public.get_other_user_profile_bootstrap(uuid) to authenticated, service_role;

-- ─── Own profile bootstrap (profile + stats + tabs) ───────────
create or replace function public.get_my_profile_bootstrap(p_with_stats boolean default true)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := (select auth.uid());
  v_profile jsonb;
  v_stats jsonb := '{}'::jsonb;
  v_people int := 0;
  v_prayers int := 0;
  v_stage int := 0;
  v_conn_count int;
  v_communities jsonb;
  v_maps jsonb;
  v_posts jsonb;
  v_reposts jsonb;
  v_prayer_list jsonb;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select to_jsonb(p) into v_profile
  from public.profiles p where p.id = v_me;
  if v_profile is null then
    return jsonb_build_object('profile', null);
  end if;

  if p_with_stats then
    select count(*)::int into v_people from public.oikos_people where user_id = v_me;
    select count(*)::int into v_prayers from public.prayer_logs where user_id = v_me;
    select coalesce(max(stage), 0)::int into v_stage
    from public.impact_map_progress
    where owner_id = v_me and completed_at is not null;
    v_stats := jsonb_build_object(
      'peopleCount', v_people,
      'prayerCount', v_prayers,
      'maxStage', v_stage
    );
  end if;

  select count(*)::int into v_conn_count
  from public.friendships f
  where f.status = 'accepted'
    and (f.requester_id = v_me or f.addressee_id = v_me);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'is_public', c.is_public
  ) order by c.name), '[]'::jsonb)
  into v_communities
  from public.community_members cm
  join public.communities c on c.id = cm.community_id
  where cm.user_id = v_me and c.is_public is true;

  select coalesce(jsonb_agg(
    to_jsonb(om) || jsonb_build_object(
      'personCount', (select count(*)::int from public.oikos_people op where op.map_id = om.id)
    )
    order by om.created_at
  ), '[]'::jsonb)
  into v_maps
  from public.oikos_maps om
  where om.user_id = v_me;

  -- Own posts (all), with engagement — limit 50
  select coalesce(jsonb_agg(p.obj order by p.created_at desc), '[]'::jsonb)
  into v_posts
  from (
    select jsonb_build_object(
      'id', fp.id,
      'author_id', fp.author_id,
      'type', fp.type,
      'category', fp.category,
      'title', fp.title,
      'body', fp.body,
      'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference,
      'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id,
      'bible_book', fp.bible_book,
      'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start,
      'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public,
      'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids,
      'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count,
      'bookmark_count', fp.bookmark_count,
      'created_at', fp.created_at,
      'profiles', jsonb_build_object(
        'id', pr.id, 'full_name', pr.full_name, 'username', pr.username,
        'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian
      ),
      'reactions', coalesce((
        select jsonb_agg(jsonb_build_object('post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type))
        from public.feed_reactions fr where fr.post_id = fp.id
      ), '[]'::jsonb),
      'commentCount', (select count(*)::int from public.feed_comments fc where fc.post_id = fp.id),
      'reposts', coalesce((
        select jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id))
        from public.feed_reposts r where r.post_id = fp.id
      ), '[]'::jsonb),
      'bookmarked', exists(select 1 from public.feed_bookmarks fb where fb.post_id = fp.id and fb.user_id = v_me)
    ) as obj,
    fp.created_at
    from public.feed_posts fp
    join public.profiles pr on pr.id = fp.author_id
    where fp.author_id = v_me
    order by fp.created_at desc
    limit 50
  ) p;

  select coalesce(jsonb_agg(x.obj order by x.repost_at desc), '[]'::jsonb)
  into v_reposts
  from (
    select jsonb_build_object(
      'id', fp.id,
      'author_id', fp.author_id,
      'type', fp.type,
      'category', fp.category,
      'title', fp.title,
      'body', fp.body,
      'photo_url', fp.photo_url,
      'bible_reference', fp.bible_reference,
      'bible_verse', fp.bible_verse,
      'bible_id', fp.bible_id,
      'bible_book', fp.bible_book,
      'bible_chapter', fp.bible_chapter,
      'bible_verse_start', fp.bible_verse_start,
      'bible_verse_end', fp.bible_verse_end,
      'is_public', fp.is_public,
      'visibility_mode', fp.visibility_mode,
      'visibility_user_ids', fp.visibility_user_ids,
      'excluded_user_ids', fp.excluded_user_ids,
      'view_count', fp.view_count,
      'bookmark_count', fp.bookmark_count,
      'created_at', fp.created_at,
      'profiles', jsonb_build_object(
        'id', pr.id, 'full_name', pr.full_name, 'username', pr.username,
        'avatar_url', pr.avatar_url, 'is_christian', pr.is_christian
      ),
      'reactions', coalesce((
        select jsonb_agg(jsonb_build_object('post_id', fr.post_id, 'user_id', fr.user_id, 'type', fr.type))
        from public.feed_reactions fr where fr.post_id = fp.id
      ), '[]'::jsonb),
      'commentCount', (select count(*)::int from public.feed_comments fc where fc.post_id = fp.id),
      'reposts', coalesce((
        select jsonb_agg(jsonb_build_object('post_id', r.post_id, 'user_id', r.user_id))
        from public.feed_reposts r where r.post_id = fp.id
      ), '[]'::jsonb),
      'bookmarked', exists(select 1 from public.feed_bookmarks fb where fb.post_id = fp.id and fb.user_id = v_me)
    ) as obj,
    frp.created_at as repost_at
    from public.feed_reposts frp
    join public.feed_posts fp on fp.id = frp.post_id
    join public.profiles pr on pr.id = fp.author_id
    where frp.user_id = v_me
    order by frp.created_at desc
    limit 50
  ) x;

  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  into v_prayer_list
  from (
    select jsonb_build_object(
      'id', ppr.id, 'title', ppr.title, 'description', ppr.description,
      'category', ppr.category, 'is_answered', ppr.is_answered,
      'is_public', ppr.visibility <> 'private', 'created_at', ppr.created_at,
      'source', 'personal'
    ) as obj, ppr.created_at
    from public.personal_prayer_requests ppr where ppr.owner_id = v_me
    union all
    select jsonb_build_object(
      'id', pr.id, 'title', pr.title, 'description', pr.description,
      'category', null, 'is_answered', pr.is_answered,
      'is_public', pr.is_public, 'created_at', pr.created_at,
      'source', 'person'
    ), pr.created_at
    from public.prayer_requests pr where pr.owner_id = v_me
  ) q;

  return jsonb_build_object(
    'profile', v_profile,
    'stats', v_stats,
    'connections_count', v_conn_count,
    'public_communities', coalesce(v_communities, '[]'::jsonb),
    'maps', coalesce(v_maps, '[]'::jsonb),
    'posts', coalesce(v_posts, '[]'::jsonb),
    'reposts', coalesce(v_reposts, '[]'::jsonb),
    'prayer_requests', coalesce(v_prayer_list, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_my_profile_bootstrap(boolean) from public, anon;
grant execute on function public.get_my_profile_bootstrap(boolean) to authenticated, service_role;
