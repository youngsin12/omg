import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthErrorPageUrl,
  createAuthError,
  getAuthErrorDisplay,
} from "../app/lib/auth/errors.ts";

test("createAuthError returns a consistent auth error schema", () => {
  const result = createAuthError({
    code: "OAUTH_CODE_EXCHANGE_FAILED",
    message: "Google 로그인 세션 교환에 실패했습니다.",
    requestId: "req-123",
    retryable: true,
    source: "server",
    details: {
      provider: "google",
      next: "/dashboard",
      status: 400,
    },
  });

  assert.deepEqual(result, {
    error: {
      code: "OAUTH_CODE_EXCHANGE_FAILED",
      message: "Google 로그인 세션 교환에 실패했습니다.",
      requestId: "req-123",
      retryable: true,
      source: "server",
      details: {
        provider: "google",
        next: "/dashboard",
        status: 400,
      },
    },
  });
});

test("buildAuthErrorPageUrl includes code, requestId, and retryable flags", () => {
  const url = buildAuthErrorPageUrl("https://app.example.com", {
    code: "OAUTH_CALLBACK_MISSING_CODE",
    requestId: "req-456",
    retryable: false,
  });

  assert.equal(
    url,
    "https://app.example.com/auth/auth-code-error?code=OAUTH_CALLBACK_MISSING_CODE&requestId=req-456&retryable=0"
  );
});

test("getAuthErrorDisplay returns stable copy for known error codes", () => {
  assert.deepEqual(getAuthErrorDisplay("OAUTH_START_FAILED"), {
    title: "로그인 시작에 실패했습니다.",
    description:
      "Google 로그인 요청을 시작하지 못했습니다. Supabase 또는 OAuth 설정을 확인한 뒤 다시 시도해주세요.",
  });

  assert.deepEqual(getAuthErrorDisplay("UNKNOWN_CODE"), {
    title: "로그인 연결을 완료하지 못했습니다.",
    description:
      "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하고, 문제가 계속되면 설정과 서버 로그를 확인해주세요.",
  });
});
