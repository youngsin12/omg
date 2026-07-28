"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { safeNextPath } from "../auth/redirect";

export default function GoogleLoginButton({ next }: { next: string | null }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", safeNextPath(next));

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
      },
    });

    if (signInError) {
      setError("Google 로그인을 시작하지 못했습니다. Supabase 설정을 확인해주세요.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 font-outfit text-base font-black text-blue-600">
          G
        </span>
        {loading ? "Google로 이동 중…" : "Google로 계속하기"}
      </button>
      {error ? (
        <p className="mt-3 text-sm leading-6 text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
