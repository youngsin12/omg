import { createAuthError, type AuthErrorCode } from "../auth/errors";

export class SupabaseConfigError extends Error {
  readonly code: AuthErrorCode = "SUPABASE_CONFIG_MISSING";

  constructor(message = "Supabase public environment variables are not configured") {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new SupabaseConfigError();
  }

  return { url, key };
}

export function createSupabaseConfigAuthError(requestId: string, source: "client" | "server" | "middleware") {
  return createAuthError({
    code: "SUPABASE_CONFIG_MISSING",
    message: "Supabase 공개 환경변수가 설정되지 않았습니다.",
    requestId,
    retryable: false,
    source,
  });
}
