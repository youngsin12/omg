type AuthLogLevel = "info" | "warn" | "error";

type AuthLogFields = Record<string, string | number | boolean | null | undefined>;

export function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logAuthEvent(
  level: AuthLogLevel,
  event: string,
  fields: AuthLogFields = {}
) {
  const payload = JSON.stringify({
    scope: "proshot.auth",
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
