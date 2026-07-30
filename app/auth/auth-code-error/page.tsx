import Link from "next/link";
import { getAuthErrorDisplay, isAuthErrorCode } from "../../lib/auth/errors";

type AuthCodeErrorPageProps = {
  searchParams: Promise<{
    code?: string;
    requestId?: string;
    retryable?: string;
  }>;
};

export default async function AuthCodeErrorPage({
  searchParams,
}: AuthCodeErrorPageProps) {
  const params = await searchParams;
  const code = isAuthErrorCode(params.code) ? params.code : null;
  const display = getAuthErrorDisplay(code);
  const retryable = params.retryable !== "0";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">
          Login interrupted
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-900">{display.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{display.description}</p>

        {code || params.requestId ? (
          <dl className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
            {code ? (
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-slate-700">오류 코드</dt>
                <dd className="text-right">{code}</dd>
              </div>
            ) : null}
            {params.requestId ? (
              <div className="mt-2 flex justify-between gap-4">
                <dt className="font-bold text-slate-700">요청 ID</dt>
                <dd className="text-right">{params.requestId}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-slate-400">
          {retryable
            ? "잠시 후 다시 시도해도 됩니다. 같은 문제가 반복되면 Redirect URL과 Google OAuth 설정을 함께 확인해주세요."
            : "재시도 전에 설정값을 먼저 확인해주세요. 특히 Supabase 공개 환경변수가 비어 있지 않은지 점검해야 합니다."}
        </p>

        <div className="mt-7 flex gap-3">
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            로그인 다시 시도
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            홈으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
