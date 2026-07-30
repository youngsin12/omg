import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import SavedPhotos, { type SavedPhoto } from "./SavedPhotos";
import DashboardVisitTracker from "./DashboardVisitTracker";
import { createClient } from "../lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const displayName =
    user.user_metadata?.full_name || user.user_metadata?.name || "ProShot 사용자";
  let savedPhotos: SavedPhoto[] = [];
  let recentJobs: Array<{
    id: string;
    status: string;
    style_id: string;
    model: string;
    processing_ms: number | null;
    estimated_cost_usd: number;
    created_at: string;
  }> = [];
  let storageReady = true;
  let todayUsage: {
    generation_count: number;
    successful_count: number;
    failed_count: number;
    estimated_cost_usd: number;
  } | null = null;

  const { data: photoRows, error: photosError } = await supabase
    .from("photo_assets")
    .select(
      "id, storage_path, created_at, generation_jobs(style_id, model)"
    )
    .order("created_at", { ascending: false })
    .limit(24);

  if (photosError) {
    storageReady = false;
  } else if (photoRows?.length) {
    const photosWithUrls = await Promise.all(
      photoRows.map(async (photo) => {
        const { data, error } = await supabase.storage
          .from("proshot-photos")
          .createSignedUrl(photo.storage_path, 60 * 60);

        if (error || !data?.signedUrl) return null;
        const generationJob = Array.isArray(photo.generation_jobs)
          ? photo.generation_jobs[0]
          : photo.generation_jobs;

        return {
          id: photo.id,
          storagePath: photo.storage_path,
          signedUrl: data.signedUrl,
          styleId: generationJob?.style_id ?? "알 수 없는 스타일",
          model: generationJob?.model ?? "알 수 없는 모델",
          createdAt: photo.created_at,
        } satisfies SavedPhoto;
      })
    );
    savedPhotos = photosWithUrls.filter(
      (photo): photo is SavedPhoto => photo !== null
    );
  }

  if (storageReady) {
    const { data: jobRows, error: jobsError } = await supabase
      .from("generation_jobs")
      .select(
        "id, status, style_id, model, processing_ms, estimated_cost_usd, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (jobsError) {
      storageReady = false;
    } else {
      recentJobs = jobRows ?? [];
    }
  }

  if (storageReady) {
    const koreaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const { data: usageRow, error: usageError } = await supabase
      .from("usage_daily")
      .select(
        "generation_count, successful_count, failed_count, estimated_cost_usd"
      )
      .eq("usage_date", koreaDate)
      .maybeSingle();

    if (!usageError) {
      todayUsage = usageRow;
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <DashboardVisitTracker />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="font-outfit text-xl font-extrabold">
            ProShot
          </Link>
          <LogoutButton />
        </div>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["오늘 생성", todayUsage?.generation_count ?? 0, "회"],
            ["성공", todayUsage?.successful_count ?? 0, "회"],
            ["실패", todayUsage?.failed_count ?? 0, "회"],
            [
              "예상 API 비용",
              `$${Number(todayUsage?.estimated_cost_usd ?? 0).toFixed(4)}`,
              "",
            ],
          ].map(([label, value, suffix]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {value}
                <span className="ml-1 text-sm text-slate-400">{suffix}</span>
              </p>
            </article>
          ))}
        </section>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl bg-slate-950 p-8 text-white sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">
              Authenticated workspace
            </p>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
              {displayName}님,
              <br />
              촬영을 시작할 준비가 됐어요.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">
              이 페이지는 로그인 세션이 확인된 사용자만 볼 수 있습니다. 다음 단계에서
              사용자별 생성 기록과 보관 정책을 연결할 수 있습니다.
            </p>
            <Link
              href="/#create"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              새 사진 만들기
            </Link>
          </article>

          <aside className="rounded-3xl border border-slate-200 bg-white p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <span className="text-sm font-extrabold">세션 상태</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                로그인됨
              </span>
            </div>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-xs font-bold text-slate-400">이메일</dt>
                <dd className="mt-1 break-all text-sm font-bold">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-400">보호 방식</dt>
                <dd className="mt-1 text-sm font-bold">Supabase 쿠키 세션</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-400">사진 저장</dt>
                <dd
                  className={`mt-1 text-sm font-bold ${
                    storageReady ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {storageReady ? "비공개 저장 활성화" : "원격 설정 적용 필요"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
                Private gallery
              </p>
              <h2 className="mt-1 text-2xl font-black">저장한 사진</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              본인 계정에서만 표시
            </span>
          </div>
          {storageReady ? (
            <SavedPhotos initialPhotos={savedPhotos} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-700">
              Supabase Storage 마이그레이션을 적용하면 비공개 저장 기능이 활성화됩니다.
            </div>
          )}
        </section>
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
              Generation history
            </p>
            <h2 className="mt-1 text-2xl font-black">최근 생성 작업</h2>
          </div>
          {!storageReady ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-700">
              Supabase 마이그레이션 적용 후 생성 이력이 표시됩니다.
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              아직 기록된 생성 작업이 없습니다.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      {job.style_id}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{job.model}</p>
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {job.processing_ms === null
                      ? "처리 시간 기록 전"
                      : `${(job.processing_ms / 1000).toFixed(1)}초`}
                    {" · "}
                    ${Number(job.estimated_cost_usd).toFixed(4)}
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                      job.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : job.status === "failed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {job.status === "completed"
                      ? "완료"
                      : job.status === "failed"
                        ? "실패"
                        : "처리 중"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
