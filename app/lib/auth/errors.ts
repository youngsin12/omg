export const AUTH_ERROR_CODES = [
  "OAUTH_START_FAILED",
  "OAUTH_CODE_EXCHANGE_FAILED",
  "OAUTH_CALLBACK_MISSING_CODE",
  "SESSION_CHECK_FAILED",
  "LOGOUT_FAILED",
  "SUPABASE_CONFIG_MISSING",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
export type AuthErrorSource = "client" | "server" | "middleware";

export type AuthErrorDetails = {
  provider?: "google";
  next?: string;
  pathname?: string;
  status?: number;
  reason?: string;
};

export type AuthErrorPayload = {
  code: AuthErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
  source: AuthErrorSource;
  details?: AuthErrorDetails;
};

export function createAuthError(error: AuthErrorPayload) {
  return { error };
}

export function buildAuthErrorPageUrl(
  origin: string,
  params: {
    code: AuthErrorCode;
    requestId: string;
    retryable: boolean;
  }
) {
  const url = new URL("/auth/auth-code-error", origin);
  url.searchParams.set("code", params.code);
  url.searchParams.set("requestId", params.requestId);
  url.searchParams.set("retryable", params.retryable ? "1" : "0");
  return url.toString();
}

export function getAuthErrorDisplay(code: string | null | undefined): {
  title: string;
  description: string;
} {
  switch (code) {
    case "OAUTH_START_FAILED":
      return {
        title: "로그인 시작에 실패했습니다.",
        description:
          "Google 로그인 요청을 시작하지 못했습니다. Supabase 또는 OAuth 설정을 확인한 뒤 다시 시도해주세요.",
      };
    case "OAUTH_CALLBACK_MISSING_CODE":
      return {
        title: "로그인 응답이 중간에 끊겼습니다.",
        description:
          "Google에서 필요한 인증 코드가 돌아오지 않았습니다. 다시 시도하고, 계속되면 Redirect URL 설정을 확인해주세요.",
      };
    case "OAUTH_CODE_EXCHANGE_FAILED":
      return {
        title: "로그인 세션 연결에 실패했습니다.",
        description:
          "Google 응답을 ProShot 세션으로 바꾸는 단계에서 실패했습니다. Google OAuth와 Supabase Redirect URL 설정을 다시 확인해주세요.",
      };
    case "SESSION_CHECK_FAILED":
      return {
        title: "로그인 상태를 확인하지 못했습니다.",
        description:
          "세션 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    case "LOGOUT_FAILED":
      return {
        title: "로그아웃을 완료하지 못했습니다.",
        description:
          "세션 종료 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    case "SUPABASE_CONFIG_MISSING":
      return {
        title: "로그인 설정이 비어 있습니다.",
        description:
          "Supabase 공개 환경변수가 설정되지 않았습니다. .env.local 값을 확인해주세요.",
      };
    default:
      return {
        title: "로그인 연결을 완료하지 못했습니다.",
        description:
          "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하고, 문제가 계속되면 설정과 서버 로그를 확인해주세요.",
      };
  }
}

export function isAuthErrorCode(
  value: string | null | undefined
): value is AuthErrorCode {
  return Boolean(value && AUTH_ERROR_CODES.includes(value as AuthErrorCode));
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
