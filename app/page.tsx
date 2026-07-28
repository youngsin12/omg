import Image from "next/image";
import UploadCard from "./components/UploadCard";
import { getSupabaseConnectionStatus } from "./lib/supabase.server";

export const dynamic = "force-dynamic";

const STEPS = [
  ["1", "사진 올리기", "정면이 잘 보이는 사진 한 장을 선택하세요."],
  ["2", "스타일 고르기", "프로필, 증명사진, 컨셉 중 하나를 고르세요."],
  ["3", "결과 저장하기", "결과를 비교한 뒤 다운로드하거나 공유하세요."],
] as const;

export default async function Home() {
  const supabase = await getSupabaseConnectionStatus();
  const isSupabaseConnected = supabase.status === "connected";

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <span className="font-outfit text-xl font-extrabold tracking-tight">
            ProShot
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 text-xs font-bold sm:flex ${
                isSupabaseConnected ? "text-emerald-600" : "text-amber-600"
              }`}
              title="RLS로 보호된 테스트 행을 읽어 연결 상태를 확인합니다."
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSupabaseConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              Supabase {isSupabaseConnected ? "연결됨" : "확인 필요"}
            </span>
            <a
              href="#create"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700"
            >
              사진 만들기
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-10 pt-14 text-center sm:pt-20">
        <p className="mb-4 text-sm font-bold text-indigo-600">
          사진 한 장으로 간단하게
        </p>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          필요한 모습으로
          <br />
          자연스럽게 바꿔보세요
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          프로필, 증명사진, 재미있는 컨셉까지. 사진을 올리고 원하는
          스타일만 고르면 됩니다.
        </p>
      </section>

      <section id="create" className="scroll-mt-20 px-5 pb-16">
        <UploadCard />
      </section>

      <section className="border-y border-slate-200 bg-white px-5 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold">어떻게 달라지나요?</h2>
            <p className="mt-2 text-sm text-slate-500">
              원본 얼굴은 유지하고 선택한 스타일만 적용합니다.
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-5">
            <figure>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src="/images/selfie_before.png"
                  alt="변환 전 셀카"
                  fill
                  sizes="(max-width: 640px) 45vw, 320px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 text-center text-xs font-bold text-slate-500">
                변환 전
              </figcaption>
            </figure>
            <figure>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src="/images/profile_after.png"
                  alt="변환 후 프로필 사진"
                  fill
                  sizes="(max-width: 640px) 45vw, 320px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2 text-center text-xs font-bold text-indigo-600">
                변환 후
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="mb-8 text-center text-2xl font-extrabold">
          세 단계면 충분해요
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(([number, title, description]) => (
            <div
              key={number}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-black text-indigo-600">
                {number}
              </span>
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          여권·증명사진은 제출 전에 해당 기관의 최신 규격을 확인하세요.
        </p>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-xs text-slate-400">
        ProShot · AI CITY BUILDERS
      </footer>
    </main>
  );
}
