create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  style_id text not null,
  generation_mode text not null
    check (generation_mode in ('preview', 'standard', 'pro')),
  model text not null,
  estimated_cost_usd numeric(10, 4) not null default 0
    check (estimated_cost_usd >= 0),
  processing_ms integer check (processing_ms is null or processing_ms >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id)
);

create index generation_jobs_user_created_idx
on public.generation_jobs (user_id, created_at desc);

alter table public.generation_jobs enable row level security;

revoke all on table public.generation_jobs from anon;
revoke all on table public.generation_jobs from authenticated;
grant select, insert, update on table public.generation_jobs to authenticated;

create policy "users_can_read_own_generation_jobs"
on public.generation_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_can_insert_own_generation_jobs"
on public.generation_jobs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_can_update_own_generation_jobs"
on public.generation_jobs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table public.photo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_job_id uuid not null,
  storage_path text not null unique,
  asset_type text not null
    check (asset_type in ('generated', 'print_sheet')),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 8388608),
  created_at timestamptz not null default now(),
  constraint photo_assets_job_owner_fk
    foreign key (generation_job_id, user_id)
    references public.generation_jobs (id, user_id)
    on delete cascade,
  constraint photo_assets_storage_path_owned
    check (storage_path like user_id::text || '/%')
);

create index photo_assets_user_created_idx
on public.photo_assets (user_id, created_at desc);

alter table public.photo_assets enable row level security;

revoke all on table public.photo_assets from anon;
revoke all on table public.photo_assets from authenticated;
grant select, insert, delete on table public.photo_assets to authenticated;

create policy "users_can_read_own_photo_assets"
on public.photo_assets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_can_insert_own_photo_assets"
on public.photo_assets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_can_delete_own_photo_assets"
on public.photo_assets
for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'proshot-photos',
  'proshot-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users_can_upload_own_proshot_photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'proshot-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "users_can_read_own_proshot_photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'proshot-photos'
  and owner_id = (select auth.uid()::text)
);

create policy "users_can_delete_own_proshot_photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'proshot-photos'
  and owner_id = (select auth.uid()::text)
);
