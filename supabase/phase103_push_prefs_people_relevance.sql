-- ============================================================
-- Phase 103: Push-Einstellungen pro Typ + relevante Geschwister-Vorschläge
-- ============================================================
-- 1) Push ist standardmäßig für ALLE Benachrichtigungsarten an. Wer einzelne
--    Arten abschalten will, trägt sie in profiles.push_disabled_types ein
--    (Opt-out statt Opt-in -> neue Typen kommen automatisch an).
-- 2) notify_push_dispatch überspringt abgeschaltete Typen.
-- 3) get_people_you_may_know: Ranking nach Relevanz statt "neueste Konten".
-- Idempotent.

alter table public.profiles
  add column if not exists push_disabled_types jsonb not null default '[]'::jsonb;

grant update (push_disabled_types) on public.profiles to authenticated;

create or replace function public.notify_push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Ohne registriertes Gerät ist der HTTP-Call reine Verschwendung.
  IF NOT EXISTS (SELECT 1 FROM public.device_tokens WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Vom Nutzer abgeschaltete Benachrichtigungsart -> kein Push (In-App bleibt).
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.user_id AND push_disabled_types ? NEW.type
  ) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';

  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://mnmjkmfdggscwfpoygwb.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Webhook-Secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ── Relevante Vorschläge ─────────────────────────────────────────────
-- Punkte: gemeinsame Geschwister (stärkstes Signal), gemeinsame (nicht-
-- regionale) Communities, gleiche Stadt, Anzahl eigener Verbindungen
-- (gedeckelt), aktuelle Aktivität (App geöffnet / gebetet / gepostet),
-- gepflegtes Profil. Konten ohne jedes Signal (leer, inaktiv, ohne
-- Verbindungen) erscheinen gar nicht.
create or replace function public.get_people_you_may_know(p_limit int default 10)
returns table (
  id uuid, username text, full_name text, is_christian boolean,
  avatar_url text, city text, mutual_count int, mutual_people jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select (select auth.uid()) as uid,
           (select lower(nullif(trim(p.city), '')) from profiles p where p.id = (select auth.uid())) as city
  ),
  my_friends as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as fid
    from friendships f, me
    where f.status = 'accepted' and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  connected as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as cid
    from friendships f, me
    where f.status <> 'declined' and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  fof as (
    select
      case when f.requester_id in (select fid from my_friends) then f.addressee_id else f.requester_id end as candidate,
      case when f.requester_id in (select fid from my_friends) then f.requester_id else f.addressee_id end as connector
    from friendships f
    where f.status = 'accepted'
      and (f.requester_id in (select fid from my_friends) or f.addressee_id in (select fid from my_friends))
  ),
  mutual as (
    select candidate, count(distinct connector)::int as cnt, array_agg(distinct connector) as connectors
    from fof, me
    where candidate <> me.uid
    group by candidate
  ),
  my_comms as (
    select cm.community_id
    from community_members cm
    join communities c on c.id = cm.community_id and c.region_key is null
    where cm.user_id = (select auth.uid())
  ),
  base as (
    select
      p.id as pid, p.last_active_at, p.created_at,
      coalesce(m.cnt, 0) as cnt, m.connectors,
      (select count(*) from community_members cm
        where cm.user_id = p.id and cm.community_id in (select community_id from my_comms))::int as shared_comms,
      (select count(*) from friendships f
        where f.status = 'accepted' and (f.requester_id = p.id or f.addressee_id = p.id))::int as fcount,
      (me.city is not null and lower(nullif(trim(p.city), '')) = me.city) as same_city,
      (p.last_active_at is not null and p.last_active_at > now() - interval '14 days') as active,
      (exists (select 1 from prayer_logs pl where pl.user_id = p.id and pl.created_at > now() - interval '30 days')
        or exists (select 1 from feed_posts fp where fp.author_id = p.id and fp.created_at > now() - interval '30 days')) as contributes,
      (p.avatar_url is not null and p.avatar_url <> '') as has_avatar,
      (coalesce(nullif(trim(p.bio), ''), nullif(trim(p.bio_text), '')) is not null) as has_bio
    from profiles p
    cross join me
    left join mutual m on m.candidate = p.id
    where p.id <> me.uid
      and p.id not in (select cid from connected)
      and not public.is_blocked_pair(p.id)
  ),
  scored as (
    select b.*,
      (b.cnt * 10
       + b.shared_comms * 4
       + case when b.same_city then 3 else 0 end
       + least(b.fcount, 10) * 1.5
       + case when b.active then 4 else 0 end
       + case when b.contributes then 2 else 0 end
       + case when b.has_avatar then 1 else 0 end
       + case when b.has_bio then 1 else 0 end) as score
    from base b
    where b.cnt > 0 or b.shared_comms > 0 or b.same_city
       or b.fcount >= 2
       or (b.active and (b.has_avatar or b.has_bio or b.contributes))
  ),
  picked as (
    select * from scored
    order by score desc, last_active_at desc nulls last, created_at desc
    limit greatest(coalesce(p_limit, 10), 1)
  )
  select
    p.id, p.username, p.full_name, p.is_christian, p.avatar_url, p.city,
    pk.cnt,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'username', c.username, 'full_name', c.full_name, 'avatar_url', c.avatar_url))
      from profiles c where c.id = any(pk.connectors)
    ), '[]'::jsonb)
  from picked pk
  join profiles p on p.id = pk.pid
  order by pk.score desc, pk.last_active_at desc nulls last, pk.created_at desc;
$$;

revoke all on function public.get_people_you_may_know(int) from public, anon;
grant execute on function public.get_people_you_may_know(int) to authenticated;
