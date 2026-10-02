-- ============================================================
-- Phase 67: Native Push (APNs) – Device-Tokens
-- ============================================================
-- Web Push (VAPID/Service Worker) funktioniert in der nativen iOS-App
-- (WKWebView) nicht. Stattdessen registriert sich die App über
-- @capacitor/push-notifications direkt bei APNs und legt das zurückgegebene
-- Device-Token hier ab. Die Edge Function `send-push` liest die Tokens des
-- Empfängers und stellt die Nachricht an Apple zu.
--
-- Ein Nutzer kann mehrere Geräte haben -> mehrere Zeilen pro user_id.
-- Das Token selbst ist der eindeutige Schlüssel: wechselt das Gerät den
-- Besitzer (anderer Login), wird die Zeile per upsert dem neuen Nutzer
-- zugeordnet statt doppelt angelegt.
-- Idempotent – kann mehrfach ausgeführt werden.

create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  token      text not null unique,
  platform   text not null default 'ios' check (platform in ('ios', 'android')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Nutzer verwalten ausschließlich ihre eigenen Tokens. Die Edge Function
-- liest mit dem Service-Role-Key und umgeht RLS ohnehin.
drop policy if exists "Own device tokens" on public.device_tokens;
create policy "Own device tokens" on public.device_tokens
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
