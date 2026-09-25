-- Phase 72: Backend „warm halten" (Kaltstart-Abmilderung)
-- Idempotent: kann mehrfach ausgeführt werden.
--
-- Befund (Edge-/PostgREST-Logs, Sep. 2026): Nach ein paar Stunden ohne
-- Nutzung brauchten ALLE API-Requests beim ersten App-Start 6–20 s, warm
-- dagegen 50–150 ms. Die kleine Compute-Instanz lagert im Leerlauf aus; der
-- erste Zugriff muss PostgREST + Postgres erst wieder „aufwecken".
--
-- Dieser Job ruft alle 4 Minuten einen winzigen Endpunkt über denselben Weg
-- auf wie die App (API-Gateway → PostgREST → Postgres, dazu Auth-Health), damit
-- die Dienste nie kalt werden. Kosten: ~360 Mini-Requests pro Tag.
-- Der Publishable Key ist öffentlich (steckt ohnehin in jedem App-Bundle).
--
-- Entfernen: select cron.unschedule('oikos-keep-warm');

select cron.unschedule(jobid) from cron.job where jobname = 'oikos-keep-warm';

select cron.schedule(
  'oikos-keep-warm',
  '*/4 * * * *',
  $job$
    select net.http_get(
      url := 'https://mnmjkmfdggscwfpoygwb.supabase.co/rest/v1/rpc/is_username_available?p_username=__keepwarm__',
      headers := jsonb_build_object('apikey', 'sb_publishable_2M-wMh0jdR7IpYsO2_p3xA_NqcR1n6i'),
      timeout_milliseconds := 20000
    );
    select net.http_get(
      url := 'https://mnmjkmfdggscwfpoygwb.supabase.co/auth/v1/health',
      headers := jsonb_build_object('apikey', 'sb_publishable_2M-wMh0jdR7IpYsO2_p3xA_NqcR1n6i'),
      timeout_milliseconds := 20000
    );
  $job$
);
