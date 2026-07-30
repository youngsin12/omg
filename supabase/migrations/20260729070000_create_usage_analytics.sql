create table public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  generation_count integer not null default 0 check (generation_count >= 0),
  successful_count integer not null default 0 check (successful_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  estimated_cost_usd numeric(10, 4) not null default 0
    check (estimated_cost_usd >= 0),
  primary key (user_id, usage_date)
);

alter table public.usage_daily enable row level security;

revoke all on table public.usage_daily from anon;
revoke all on table public.usage_daily from authenticated;
grant select on table public.usage_daily to authenticated;

create policy "users_can_read_own_usage_daily"
on public.usage_daily
for select
to authenticated
using ((select auth.uid()) = user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_usage_daily_from_generation_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'generation job owner mismatch';
  end if;

  if tg_op = 'INSERT' then
    insert into public.usage_daily (
      user_id,
      usage_date,
      generation_count
    )
    values (
      new.user_id,
      timezone('Asia/Seoul', new.created_at)::date,
      1
    )
    on conflict (user_id, usage_date) do update
    set generation_count = public.usage_daily.generation_count + 1;
  elsif
    tg_op = 'UPDATE'
    and old.status not in ('completed', 'failed')
    and new.status in ('completed', 'failed')
  then
    insert into public.usage_daily (
      user_id,
      usage_date,
      successful_count,
      failed_count,
      estimated_cost_usd
    )
    values (
      new.user_id,
      timezone('Asia/Seoul', new.created_at)::date,
      case when new.status = 'completed' then 1 else 0 end,
      case when new.status = 'failed' then 1 else 0 end,
      case when new.status = 'completed' then new.estimated_cost_usd else 0 end
    )
    on conflict (user_id, usage_date) do update
    set
      successful_count = public.usage_daily.successful_count
        + case when new.status = 'completed' then 1 else 0 end,
      failed_count = public.usage_daily.failed_count
        + case when new.status = 'failed' then 1 else 0 end,
      estimated_cost_usd = public.usage_daily.estimated_cost_usd
        + case when new.status = 'completed' then new.estimated_cost_usd else 0 end;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_usage_daily_from_generation_job()
from public, anon, authenticated;

create trigger sync_usage_daily_after_generation_job_insert
after insert on public.generation_jobs
for each row
execute function private.sync_usage_daily_from_generation_job();

create trigger sync_usage_daily_after_generation_job_update
after update of status on public.generation_jobs
for each row
execute function private.sync_usage_daily_from_generation_job();

create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_job_id uuid,
  event_name text not null
    check (
      event_name in (
        'photo_saved',
        'photo_download_clicked',
        'photo_share_clicked',
        'style_regenerated',
        'dashboard_visited'
      )
    ),
  created_at timestamptz not null default now(),
  constraint product_events_job_owner_fk
    foreign key (generation_job_id, user_id)
    references public.generation_jobs (id, user_id)
    on delete set null (generation_job_id)
);

create index product_events_user_created_idx
on public.product_events (user_id, created_at desc);

create index product_events_name_created_idx
on public.product_events (event_name, created_at desc);

alter table public.product_events enable row level security;

revoke all on table public.product_events from anon;
revoke all on table public.product_events from authenticated;
grant select, insert on table public.product_events to authenticated;

create policy "users_can_read_own_product_events"
on public.product_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_can_insert_own_product_events"
on public.product_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);
