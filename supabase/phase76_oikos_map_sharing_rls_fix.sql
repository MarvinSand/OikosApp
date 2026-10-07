-- ════════════════════════════════════════════════════════════════════════
-- Phase 76: Oikos-Map-Sharing wirklich nach Sichtbarkeit einschränken
-- ════════════════════════════════════════════════════════════════════════
-- Bisher prüften die SELECT-Policies auf oikos_maps/oikos_people/
-- oikos_connections nur "visibility <> 'private'" – jede nicht-private Map
-- war für JEDEN eingeloggten Nutzer lesbar, unabhängig von
-- specific_include/specific_exclude/community/all_siblings. Die eigentliche
-- Freigabe-Logik existierte bisher nur clientseitig (useProfileTabs.js) und
-- ließ sich umgehen – z.B. konnte das "OIKOS einblenden"/Mini-Profilvorschau-
-- Feature auf einer geteilten Map fremde, gar nicht freigegebene Maps einer
-- verlinkten Person laden. Jetzt wird dieselbe Freigabe-Logik direkt in der
-- DB erzwungen. Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).

drop policy if exists "Maps lesen" on public.oikos_maps;
create policy "Maps lesen" on public.oikos_maps for select
  using (
    user_id = (select auth.uid())
    -- Legacy-Wert aus der Zeit vor specific_include/exclude/community (noch
    -- in Altdaten vorhanden, aktuell keine UI-Option mehr) – weiterhin für
    -- jeden eingeloggten Nutzer offen, wie is_public früher.
    or visibility = 'public'
    or (
      visibility = 'all_siblings' and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = oikos_maps.user_id and f.addressee_id = (select auth.uid()))
            or (f.addressee_id = oikos_maps.user_id and f.requester_id = (select auth.uid())))
      )
    )
    or (
      visibility = 'specific_include' and (select auth.uid()) = any (coalesce(visibility_user_ids, '{}'))
    )
    or (
      visibility = 'specific_exclude'
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = oikos_maps.user_id and f.addressee_id = (select auth.uid()))
            or (f.addressee_id = oikos_maps.user_id and f.requester_id = (select auth.uid())))
      )
      and not ((select auth.uid()) = any (coalesce(visibility_user_ids, '{}')))
    )
    or (
      visibility = 'community' and visibility_community_id is not null and exists (
        select 1 from public.community_members cm
        where cm.community_id = oikos_maps.visibility_community_id and cm.user_id = (select auth.uid())
      )
    )
  );

-- oikos_people: dieselbe Logik, aufgelöst über die zugehörige Map.
drop policy if exists "Personen sichtbar wenn Map nicht privat" on public.oikos_people;
drop policy if exists "Shared map people readable" on public.oikos_people;
drop policy if exists "Personen lesen" on public.oikos_people;
create policy "Personen lesen" on public.oikos_people for select
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.oikos_maps m
      where m.id = oikos_people.map_id
        and (
          m.visibility = 'public'
          or (
            m.visibility = 'all_siblings' and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = m.user_id and f.addressee_id = (select auth.uid()))
                  or (f.addressee_id = m.user_id and f.requester_id = (select auth.uid())))
            )
          )
          or (
            m.visibility = 'specific_include' and (select auth.uid()) = any (coalesce(m.visibility_user_ids, '{}'))
          )
          or (
            m.visibility = 'specific_exclude'
            and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = m.user_id and f.addressee_id = (select auth.uid()))
                  or (f.addressee_id = m.user_id and f.requester_id = (select auth.uid())))
            )
            and not ((select auth.uid()) = any (coalesce(m.visibility_user_ids, '{}')))
          )
          or (
            m.visibility = 'community' and m.visibility_community_id is not null and exists (
              select 1 from public.community_members cm
              where cm.community_id = m.visibility_community_id and cm.user_id = (select auth.uid())
            )
          )
        )
    )
  );

-- oikos_connections: gleiche Logik.
drop policy if exists "Shared map connections readable" on public.oikos_connections;
create policy "Shared map connections readable" on public.oikos_connections for select
  using (
    exists (
      select 1 from public.oikos_maps m
      where m.id = oikos_connections.map_id
        and (
          m.user_id = (select auth.uid())
          or m.visibility = 'public'
          or (
            m.visibility = 'all_siblings' and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = m.user_id and f.addressee_id = (select auth.uid()))
                  or (f.addressee_id = m.user_id and f.requester_id = (select auth.uid())))
            )
          )
          or (
            m.visibility = 'specific_include' and (select auth.uid()) = any (coalesce(m.visibility_user_ids, '{}'))
          )
          or (
            m.visibility = 'specific_exclude'
            and exists (
              select 1 from public.friendships f
              where f.status = 'accepted'
                and ((f.requester_id = m.user_id and f.addressee_id = (select auth.uid()))
                  or (f.addressee_id = m.user_id and f.requester_id = (select auth.uid())))
            )
            and not ((select auth.uid()) = any (coalesce(m.visibility_user_ids, '{}')))
          )
          or (
            m.visibility = 'community' and m.visibility_community_id is not null and exists (
              select 1 from public.community_members cm
              where cm.community_id = m.visibility_community_id and cm.user_id = (select auth.uid())
            )
          )
        )
    )
  );
