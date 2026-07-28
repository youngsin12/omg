import Link from "next/link";
import GoogleLoginButton from "./GoogleLoginButton";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.38),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.22),transparent_38%)]" />
        <Link href="/" className="relative font-outfit text-xl font-extrabold">
          ProShot
        </Link>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-indigo-300">
            Private contact sheet
          </p>
          <h1 className="text-5xl font-black leading-[1.02] tracking-tight">
            내 사진 작업을
            <br />
            한곳에서 이어가세요.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            Google 계정으로 로그인하면 보호된 작업 공간으로 이동합니다.
            원본 사진과 생성 결과의 저장 정책은 다음 단계에서 직접 선택합니다.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">
          로그인은 Supabase Auth가 처리하며 Google 비밀번호는 ProShot에 전달되지 않습니다.
        </p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
        <div className="w-full max-w-md">
          <Link href="/" className="font-outfit text-xl font-extrabold lg:hidden">
            ProShot
          </Link>
          <p className="mt-12 text-xs font-black uppercase tracking-[0.2em] text-indigo-600 lg:mt-0">
            Studio check-in
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight">
            작업 공간에 로그인
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            별도 비밀번호를 만들 필요 없이 Google 계정으로 안전하게 시작합니다.
          </p>
          <div className="mt-8">
            <GoogleLoginButton next={params.next ?? null} />
          </div>
          <p className="mt-6 text-xs leading-5 text-slate-400">
            계속하면 계정의 이메일과 공개 프로필 정보가 로그인 식별에 사용됩니다.
          </p>
        </div>
      </section>
    </main>
  );
}
