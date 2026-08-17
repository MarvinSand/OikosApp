-- ════════════════════════════════════════════════════════════════════════
-- Phase 58: Community-Admin – Löschen, Profilbild, Beitrittsanfragen
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Enthält:
--  1. communities.avatar_url (Profilbild, analog zu banner_url aus phase57)
--     + Storage-Bucket community-avatars
--  2. communities.join_mode ('open' | 'request') – nur relevant wenn
--     is_public = true. 'request' bedeutet: Community wird in "Entdecken"
--     angezeigt, Beitritt aber erst nach Admin-Freigabe.
--  3. community_join_requests – Beitrittsanfragen + RLS
--  4. respond_to_join_request() – Security-Definer-RPC, mit der Admins eine
--     Anfrage annehmen (legt die Mitgliedschaft an) oder ablehnen
--  5. community_members-Insert-Policy verschärft: Direktes Beitreten geht
--     nur noch bei öffentlichen Communities mit join_mode='open'. Für
--     private Communities war der Beitritt per Einladungscode schon vorher
--     nicht funktionsfähig (SELECT auf private communities ist Mitgliedern
--     vorbehalten – siehe RLS-Check unten), diese Änderung ändert daran
--     nichts, schließt aber die Lücke, dass jeder sich direkt in eine
--     request-Community eintragen konnte.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Profilbild ────────────────────────────────────────────────────────
alter table public.communities
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('community-avatars', 'community-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "community avatars readable" on storage.objects;
create policy "community avatars readable" on storage.objects for select
  using (bucket_id = 'community-avatars');

drop policy if exists "community avatars writable by admins" on storage.objects;
create policy "community avatars writable by admins" on storage.objects for insert
  with check (
    bucket_id = 'community-avatars'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid() and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "community avatars updatable by admins" on storage.objects;
create policy "community avatars updatable by admins" on storage.objects for update
  using (
    bucket_id = 'community-avatars'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid() and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "community avatars deletable by admins" on storage.objects;
create policy "community avatars deletable by admins" on storage.objects for delete
  using (
    bucket_id = 'community-avatars'
    and exists (
      select 1 from public.community_members cm
      where cm.user_id = auth.uid() and cm.role = 'admin'
        and cm.community_id::text = (storage.foldername(name))[1]
    )
  );

-- ── 2. Beitritts-Modus ───────────────────────────────────────────────────
alter table public.communities
  add column if not exists join_mode text not null default 'open';

alter table public.communities
  drop constraint if exists communities_join_mode_check;
alter table public.communities
  add constraint communities_join_mode_check
  check (join_mode = any (array['open', 'request']));

-- ── 3. Beitrittsanfragen ─────────────────────────────────────────────────
create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status = any (array['pending', 'approved', 'declined'])),
  created_at timestamptz default now(),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz
);

-- Pro Community+Nutzer nur eine offene Anfrage gleichzeitig.
create unique index if not exists community_join_requests_pending_uidx
  on public.community_join_requests(community_id, user_id)
  where status = 'pending';

create index if not exists community_join_requests_community_idx
  on public.community_join_requests(community_id);

alter table public.community_join_requests enable row level security;

drop policy if exists "Eigene Anfrage stellen" on public.community_join_requests;
create policy "Eigene Anfrage stellen" on public.community_join_requests for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.communities c
      where c.id = community_join_requests.community_id and c.is_public = true
    )
    and not exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Anfragen lesen" on public.community_join_requests;
create policy "Anfragen lesen" on public.community_join_requests for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id
        and cm.user_id = auth.uid() and cm.role = 'admin'
    )
  );

drop policy if exists "Eigene Anfrage zurückziehen" on public.community_join_requests;
create policy "Eigene Anfrage zurückziehen" on public.community_join_requests for delete
  using (user_id = auth.uid() and status = 'pending');

-- ── 4. Anfrage annehmen/ablehnen (Security Definer) ─────────────────────
-- Läuft als Definer, damit die Freigabe unabhängig von der (absichtlich
-- restriktiven) community_members-Insert-Policy funktioniert.
create or replace function public.respond_to_join_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req community_join_requests%rowtype;
  v_is_admin boolean;
begin
  select * into v_req from community_join_requests where id = p_request_id and status = 'pending';
  if v_req.id is null then
    raise exception 'Anfrage nicht gefunden oder bereits bearbeitet';
  end if;

  select exists(
    select 1 from community_members
    where community_id = v_req.community_id and user_id = auth.uid() and role = 'admin'
  ) into v_is_admin;
  if not v_is_admin then
    raise exception 'Nur Admins dürfen Beitrittsanfragen bearbeiten';
  end if;

  update community_join_requests
    set status = case when p_approve then 'approved' else 'declined' end,
        decided_by = auth.uid(), decided_at = now()
    where id = p_request_id;

  if p_approve then
    insert into community_members (community_id, user_id, role)
    values (v_req.community_id, v_req.user_id, 'member')
    on conflict do nothing;
  end if;
end;
$$;

-- ── 5. community_members: Direktes Beitreten nur bei offenen Communities ─
drop policy if exists "Community beitreten" on public.community_members;
drop policy if exists "Mitglied werden" on public.community_members;
create policy "Offener Beitritt" on public.community_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.is_public = true and c.join_mode = 'open'
    )
  );
