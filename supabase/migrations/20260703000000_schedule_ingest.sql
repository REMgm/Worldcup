-- Self-contained live ingest (applied to the worldcup-pulse project).
-- pg_cron invokes the ingest-espn edge function via pg_net:
--   every minute → mode=auto  (in-function guard: zero ESPN calls unless a
--                   fixture is LIVE/kicking off ±10 min; full refresh when
--                   the cache is older than 6h)
--   22:00 UTC    → mode=daily (00:00 Netherlands/CEST — nightly full refresh
--                   so the morning's signals are computed from fresh data)
--
-- The Authorization bearer below is the project's PUBLIC anon key (RLS
-- read-only) — it only satisfies the edge function's JWT gate; writes
-- happen inside the function via the service role.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'wcp-ingest-auto') then
    perform cron.unschedule('wcp-ingest-auto');
  end if;
  if exists (select 1 from cron.job where jobname = 'wcp-ingest-daily') then
    perform cron.unschedule('wcp-ingest-daily');
  end if;
end $$;

select cron.schedule(
  'wcp-ingest-auto',
  '* * * * *',
  $$select net.http_post(
      url := 'https://svjepmqfemctnyzzyxwc.supabase.co/functions/v1/ingest-espn',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amVwbXFmZW1jdG55enp5eHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjE2ODEsImV4cCI6MjA5ODU5NzY4MX0.qrGHM-_IFdbSerQNeB-PRT0NXNCCv8TX9C0_dRJ_XNM'
      ),
      body := '{"mode":"auto"}'::jsonb,
      timeout_milliseconds := 30000
    )$$
);

select cron.schedule(
  'wcp-ingest-daily',
  '0 22 * * *',
  $$select net.http_post(
      url := 'https://svjepmqfemctnyzzyxwc.supabase.co/functions/v1/ingest-espn',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amVwbXFmZW1jdG55enp5eHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjE2ODEsImV4cCI6MjA5ODU5NzY4MX0.qrGHM-_IFdbSerQNeB-PRT0NXNCCv8TX9C0_dRJ_XNM'
      ),
      body := '{"mode":"daily"}'::jsonb,
      timeout_milliseconds := 30000
    )$$
);
