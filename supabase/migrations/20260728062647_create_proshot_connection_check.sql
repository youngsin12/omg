create table public.proshot_connection_checks (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'ready' check (status = 'ready'),
  checked_at timestamptz not null default now()
);

alter table public.proshot_connection_checks enable row level security;

revoke all on table public.proshot_connection_checks from anon, authenticated;
grant select on table public.proshot_connection_checks to anon, authenticated;

create policy "public_can_read_proshot_connection_status"
on public.proshot_connection_checks
for select
to anon, authenticated
using (id = 1);

insert into public.proshot_connection_checks (id, status)
values (1, 'ready');
