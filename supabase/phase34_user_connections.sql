-- Phase 34: Vollständige Geschwister-Liste fremder Profile sichtbar machen
--
-- Problem: Die RLS-Policy auf `friendships` erlaubt einem User nur das Lesen
-- von Zeilen, in denen er selbst Requester oder Addressee ist. Beim Aufruf des
-- Profils eines anderen Users war daher nur die EINE gemeinsame Freundschaft
-- (zwischen mir und der Person) sichtbar – die Geschwister-Liste zeigte deshalb
-- immer nur "1 Geschwister" (mich selbst).
--
-- Lösung: Eine SECURITY-DEFINER-Funktion, die die öffentlichen Profil-Felder
-- aller akzeptierten Verbindungen eines beliebigen Users zurückgibt. Sie
-- umgeht die Zeilen-Restriktion kontrolliert (nur unkritische Profilfelder,
-- nur akzeptierte Freundschaften).
--
-- Idempotent: kann mehrfach ausgeführt werden.

create or replace function public.get_user_connections(target_id uuid)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  is_christian boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.username, p.avatar_url, p.is_christian
  from public.friendships f
  join public.profiles p
    on p.id = case
                when f.requester_id = target_id then f.addressee_id
                else f.requester_id
              end
  where f.status = 'accepted'
    and (f.requester_id = target_id or f.addressee_id = target_id);
$$;

grant execute on function public.get_user_connections(uuid) to authenticated;
