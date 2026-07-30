"use client";

import { useState } from "react";
import { safeNextPath } from "../auth/redirect";
import { createAuthError, toErrorMessage } from "../lib/auth/errors";
import { createRequestId, logAuthEvent } from "../lib/auth/log";
import { createClient } from "../lib/supabase/client";
import { SupabaseConfigError } from "../lib/supabase/config";

export default function GoogleLoginButton({ next }: { next: string | null }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    const requestId = createRequestId();
    const safeNext = safeNextPath(next);

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeNext);

      logAuthEvent("info", "oauth_start_requested", {
        requestId,
        provider: "google",
        next: safeNext,
        redirectTo: callback.toString(),
      });

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
        },
      });

      if (signInError) {
        const payload = createAuthError({
          code: "OAUTH_START_FAILED",
          message: "Google 로그인을 시작하지 못했습니다. Supabase 설정을 확인해주세요.",
          requestId,
          retryable: true,
          source: "client",
          details: {
            provider: "google",
            next: safeNext,
          },
        });

        logAuthEvent("error", "oauth_start_failed", {
          requestId,
          provider: "google",
          next: safeNext,
          errorCode: payload.error.code,
          errorMessage: signInError.message,
        });

        setError(`${payload.error.message} 요청 ID: ${requestId}`);
      }
    } catch (caughtError) {
      const isConfigError = caughtError instanceof SupabaseConfigError;
      const payload = createAuthError({
        code: isConfigError ? "SUPABASE_CONFIG_MISSING" : "OAUTH_START_FAILED",
        message: isConfigError
          ? "로그인 설정이 비어 있습니다. .env.local의 Supabase 공개 키를 확인해주세요."
          : "Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.",
        requestId,
        retryable: !isConfigError,
        source: "client",
        details: {
          provider: "google",
          next: safeNext,
        },
      });

      logAuthEvent("error", "oauth_start_exception", {
        requestId,
        provider: "google",
        next: safeNext,
        errorCode: payload.error.code,
        errorMessage: toErrorMessage(caughtError),
      });

      setError(`${payload.error.message} 요청 ID: ${requestId}`);
    } finally {
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
