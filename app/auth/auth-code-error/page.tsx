import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">
          Login interrupted
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-900">
          로그인 연결을 완료하지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Google OAuth 제공자와 Supabase Redirect URL 설정을 확인한 뒤 다시 시도해주세요.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          로그인 다시 시도
        </Link>
      </section>
    </main>
  );
}
