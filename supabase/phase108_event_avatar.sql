-- phase108: Eigenes Bild (Profilbild) für Events statt nur Emoji. Idempotent.
alter table public.world_map_activities
  add column if not exists avatar_url text;

comment on column public.world_map_activities.avatar_url is
  'Optionales Event-Bild (öffentliche Storage-URL, Bucket feed-photos); ersetzt das Emoji in Pin/Listen';

-- Aktuelles (Home-Highlights) liefert das Event-Bild mit
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
          'recurrence_weekdays', a.recurrence_weekdays, 'recurrence_end_date', a.recurrence_end_date,
          'recurrence_dates', a.recurrence_dates, 'avatar_url', a.avatar_url)
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
