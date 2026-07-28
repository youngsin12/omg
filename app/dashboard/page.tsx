import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="font-outfit text-xl font-extrabold">
            ProShot
          </Link>
          <LogoutButton />
        </div>
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
                <dd className="mt-1 text-sm font-bold text-amber-600">아직 비활성화</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
