import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260729033000_create_private_photo_storage.sql",
    import.meta.url
  ),
  "utf8"
);
const uploadCard = readFileSync(
  new URL("../app/components/UploadCard.tsx", import.meta.url),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../app/dashboard/page.tsx", import.meta.url),
  "utf8"
);
const analyticsMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260729070000_create_usage_analytics.sql",
    import.meta.url
  ),
  "utf8"
);

test("photo storage bucket is private and size-limited", () => {
  assert.match(migration, /'proshot-photos'/);
  assert.match(migration, /false,\s*8388608/);
  assert.match(migration, /image\/jpeg/);
  assert.match(migration, /image\/png/);
  assert.match(migration, /image\/webp/);
});

test("generation and photo tables isolate each authenticated user", () => {
  assert.match(migration, /alter table public\.generation_jobs enable row level security/);
  assert.match(migration, /alter table public\.photo_assets enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(migration, /foreign key \(generation_job_id, user_id\)/);
  assert.match(
    migration,
    /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/
  );
  assert.match(migration, /owner_id = \(select auth\.uid\(\)::text\)/);
  assert.doesNotMatch(migration, /to anon/);
});

test("generated photos are saved only after an explicit button click", () => {
  assert.match(uploadCard, /onClick=\{handleSave\}/);
  assert.match(uploadCard, /Supabase에 안전하게 저장/);
  assert.match(uploadCard, /\.from\("proshot-photos"\)\s*\.upload/);
  assert.match(uploadCard, /\.from\("photo_assets"\)\s*\.insert/);
});

test("dashboard reports private storage and renders the private gallery", () => {
  assert.match(dashboard, /비공개 저장 활성화/);
  assert.match(dashboard, /<SavedPhotos initialPhotos=\{savedPhotos\}/);
  assert.match(dashboard, /최근 생성 작업/);
});

test("usage analytics are aggregated by a protected database trigger", () => {
  assert.match(analyticsMigration, /create table public\.usage_daily/);
  assert.match(analyticsMigration, /alter table public\.usage_daily enable row level security/);
  assert.match(analyticsMigration, /create schema if not exists private/);
  assert.match(analyticsMigration, /security definer/);
  assert.match(
    analyticsMigration,
    /new\.user_id is distinct from \(select auth\.uid\(\)\)/
  );
  assert.match(
    analyticsMigration,
    /revoke all on function private\.sync_usage_daily_from_generation_job\(\)/
  );
});

test("product events allow only a fixed privacy-minimized event list", () => {
  assert.match(analyticsMigration, /create table public\.product_events/);
  assert.match(analyticsMigration, /photo_saved/);
  assert.match(analyticsMigration, /photo_download_clicked/);
  assert.match(analyticsMigration, /photo_share_clicked/);
  assert.match(analyticsMigration, /style_regenerated/);
  assert.match(analyticsMigration, /dashboard_visited/);
  assert.doesNotMatch(analyticsMigration, /metadata jsonb/);
});
