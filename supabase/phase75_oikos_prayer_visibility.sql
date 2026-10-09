-- ════════════════════════════════════════════════════════════════════════
-- Phase 75: Feinere Sichtbarkeit für Oikos-Gebetsanliegen (prayer_requests)
-- ════════════════════════════════════════════════════════════════════════
-- Bisher nur is_public (öffentlich/privat). Jetzt wie beim Feedpost:
--   public | siblings | community | specific_include | private
-- is_public bleibt als abgeleitete Spalte erhalten (= visibility = 'public'),
-- damit bestehende Abfragen weiter funktionieren. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

alter table public.prayer_requests
  add column if not exists visibility text,
  add column if not exists visibility_community_ids uuid[],
  add column if not exists visibility_user_ids uuid[];

-- Backfill aus is_public
update public.prayer_requests
  set visibility = case when is_public is false then 'private' else 'public' end
  where visibility is null;

alter table public.prayer_requests
  drop constraint if exists prayer_requests_visibility_check;
alter table public.prayer_requests
  add constraint prayer_requests_visibility_check
  check (visibility is null or visibility = any (array['public', 'siblings', 'community', 'specific_include', 'private']));

-- is_public und visibility synchron halten (alte Code-Pfade schreiben nur is_public)
create or replace function public.sync_prayer_request_visibility()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.visibility is null then
      new.visibility := case when new.is_public is false then 'private' else 'public' end;
    end if;
  elsif new.visibility is not distinct from old.visibility
        and new.is_public is distinct from old.is_public then
    new.visibility := case when new.is_public is false then 'private' else 'public' end;
  end if;
  new.is_public := (new.visibility = 'public');
  return new;
end $$;

drop trigger if exists trg_sync_prayer_request_visibility on public.prayer_requests;
create trigger trg_sync_prayer_request_visibility
  before insert or update on public.prayer_requests
  for each row execute function public.sync_prayer_request_visibility();

-- Lesen: Zusatz-Policy (permissiv, wird mit "Read prayer_requests" / Owner / is_public
-- per OR verknüpft): Geschwister, Community-Mitglieder, ausgewählte Personen.
drop policy if exists "Read prayer_requests v2" on public.prayer_requests;
create policy "Read prayer_requests v2" on public.prayer_requests for select
  using (
    (visibility = 'siblings' and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = prayer_requests.owner_id and f.addressee_id = (select auth.uid()))
          or (f.addressee_id = prayer_requests.owner_id and f.requester_id = (select auth.uid())))
    ))
    or (visibility = 'community' and exists (
      select 1 from public.community_members cm
      where cm.user_id = (select auth.uid())
        and cm.community_id = any(coalesce(prayer_requests.visibility_community_ids, '{}'::uuid[]))
    ))
    or (visibility = 'specific_include'
      and (select auth.uid()) = any(coalesce(visibility_user_ids, '{}'::uuid[])))
  );
