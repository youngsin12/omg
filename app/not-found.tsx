import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
          404
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          요청한 페이지를 찾지 못했습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          주소가 바뀌었거나 삭제된 페이지일 수 있습니다. 홈으로 돌아가서 다시 시작해주세요.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900"
        >
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}
