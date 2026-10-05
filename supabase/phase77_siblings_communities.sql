-- phase77: Communities in der Systemkarte „Meine Geschwister in Christus"
--
-- get_user_siblings_communities(p_user): Communities, in denen der Karten-Besitzer Mitglied ist
--   und die der Betrachter sehen darf (öffentlich ODER Betrachter ist selbst Mitglied).
--   * friend_ids: Mitglieder, die direkte Freunde des Besitzers sind (Linie Community → Person)
--   * members:    übrige Mitglieder – nur wenn der Betrachter selbst Mitglied ist (max. 50)
--   * Blockierte (is_blocked_pair, relativ zum Betrachter) werden ausgeblendet; max. 20 Communities.
-- Die community_members-RLS zeigt nur Mitglieder eigener Communities → SECURITY DEFINER nötig.
-- Idempotent.

create or replace function public.get_user_siblings_communities(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_viewer uuid := (select auth.uid());
  v_owner uuid := coalesce(p_user, (select auth.uid()));
  v_friends uuid[];
  v_my uuid[];
  v_result jsonb;
begin
  if v_viewer is null or v_owner is null then
    return jsonb_build_object('communities', '[]'::jsonb);
  end if;

  select coalesce(array_agg(f), '{}') into v_friends from public._friend_ids(v_owner) f;
  select coalesce(array_agg(c), '{}') into v_my from public.get_my_community_ids() c;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.name), '[]'::jsonb) into v_result
  from (
    select c.id, c.name, c.avatar_url, c.community_type, c.is_public,
      (select count(*) from public.community_members m where m.community_id = c.id) as member_count,
      coalesce((select jsonb_agg(m.user_id) from public.community_members m
                 where m.community_id = c.id and m.user_id = any(v_friends)
                   and not public.is_blocked_pair(m.user_id)), '[]'::jsonb) as friend_ids,
      case when c.id = any(v_my) then coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'full_name', p.full_name, 'username', p.username,
                                            'avatar_url', p.avatar_url, 'is_christian', coalesce(p.is_christian, false)))
          from (select m.user_id from public.community_members m
                 where m.community_id = c.id and m.user_id <> v_owner
                   and not (m.user_id = any(v_friends))
                   and not public.is_blocked_pair(m.user_id)
                 order by m.joined_at limit 50) mm
          join public.profiles p on p.id = mm.user_id), '[]'::jsonb)
        else '[]'::jsonb end as members
    from public.communities c
    join public.community_members om on om.community_id = c.id and om.user_id = v_owner
    where (c.is_public or c.id = any(v_my))
    order by c.name
    limit 20
  ) x;

  return jsonb_build_object('communities', v_result);
end; $$;
revoke execute on function public.get_user_siblings_communities(uuid) from public, anon;
grant execute on function public.get_user_siblings_communities(uuid) to authenticated;
