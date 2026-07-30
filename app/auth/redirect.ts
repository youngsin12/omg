export function safeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  if (value.includes("//") || normalized.includes("%2f")) {
    return fallback;
  }

  return value;
}
