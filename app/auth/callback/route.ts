import { NextResponse } from "next/server";
import {
  buildAuthErrorPageUrl,
  createAuthError,
  toErrorMessage,
} from "../../lib/auth/errors";
import { createRequestId, logAuthEvent } from "../../lib/auth/log";
import { createClient } from "../../lib/supabase/server";
import { SupabaseConfigError } from "../../lib/supabase/config";
import { safeNextPath } from "../redirect";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const forwardedHost = request.headers.get("x-forwarded-host");

  logAuthEvent("info", "oauth_callback_received", {
    requestId,
    hasCode: Boolean(code),
    next,
    forwardedHost,
  });

  if (!code) {
    const payload = createAuthError({
      code: "OAUTH_CALLBACK_MISSING_CODE",
      message: "Google에서 인증 코드를 돌려주지 않았습니다.",
      requestId,
      retryable: true,
      source: "server",
      details: { provider: "google", next },
    });

    logAuthEvent("warn", "oauth_callback_missing_code", {
      requestId,
      errorCode: payload.error.code,
      next,
      forwardedHost,
    });

    return NextResponse.redirect(
      buildAuthErrorPageUrl(origin, {
        code: payload.error.code,
        requestId,
        retryable: payload.error.retryable,
      })
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const payload = createAuthError({
        code: "OAUTH_CODE_EXCHANGE_FAILED",
        message: "Google 로그인 세션 교환에 실패했습니다.",
        requestId,
        retryable: true,
        source: "server",
        details: { provider: "google", next },
      });

      logAuthEvent("error", "oauth_code_exchange_failed", {
        requestId,
        errorCode: payload.error.code,
        errorMessage: error.message,
        next,
        forwardedHost,
      });

      return NextResponse.redirect(
        buildAuthErrorPageUrl(origin, {
          code: payload.error.code,
          requestId,
          retryable: payload.error.retryable,
        })
      );
    }

    const target =
      forwardedHost && process.env.NODE_ENV !== "development"
        ? `https://${forwardedHost}${next}`
        : `${origin}${next}`;

    logAuthEvent("info", "oauth_callback_redirected", {
      requestId,
      next,
      redirectTarget: target,
      forwardedHost,
    });

    return NextResponse.redirect(target);
  } catch (caughtError) {
    const isConfigError = caughtError instanceof SupabaseConfigError;
    const payload = createAuthError({
      code: isConfigError ? "SUPABASE_CONFIG_MISSING" : "OAUTH_CODE_EXCHANGE_FAILED",
      message: isConfigError
        ? "Supabase 공개 환경변수가 설정되지 않았습니다."
        : "Google 로그인 세션 교환 중 오류가 발생했습니다.",
      requestId,
      retryable: !isConfigError,
      source: "server",
      details: { provider: "google", next },
    });

    logAuthEvent("error", "oauth_callback_exception", {
      requestId,
      errorCode: payload.error.code,
      errorMessage: toErrorMessage(caughtError),
      next,
      forwardedHost,
    });

    return NextResponse.redirect(
      buildAuthErrorPageUrl(origin, {
        code: payload.error.code,
        requestId,
        retryable: payload.error.retryable,
      })
    );
  }
}
