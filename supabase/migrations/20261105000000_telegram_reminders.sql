create table if not exists public.telegram_recordatorios (
  evento_id text not null,
  tipo text not null check (tipo in ('dos_dias', 'mismo_dia')),
  fecha date not null,
  horario_inicio text not null,
  creado_en timestamptz not null default now(),
  primary key (evento_id, tipo, fecha, horario_inicio)
);

alter table public.telegram_recordatorios enable row level security;
revoke all on table public.telegram_recordatorios from anon, authenticated;
grant all on table public.telegram_recordatorios to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'telegram-reminders-every-minute';

select cron.schedule(
  'telegram-reminders-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'supabase_url'
      ) || '/functions/v1/telegram-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'telegram_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
