-- Housekeeping: cron.job_run_details (jeder Keep-Warm-Lauf schreibt Zeilen)
-- wuchs auf >12.000 Einträge/9 MB. Alte Läufe täglich löschen, spart I/O auf
-- der kleinen Instanz. Idempotent.
delete from cron.job_run_details where end_time < now() - interval '1 day';

select cron.unschedule(jobid) from cron.job where jobname = 'oikos-cron-log-cleanup';
select cron.schedule(
  'oikos-cron-log-cleanup',
  '17 3 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '1 day' $$
);
