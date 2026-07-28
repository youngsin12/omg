export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface DailyBudget {
  date: string;
  reservedUsd: number;
}

export function consumeRateLimitEntry(
  existing: RateLimitEntry | undefined,
  now: number,
  max: number,
  windowMs: number
): {
  allowed: boolean;
  retryAfterSec: number;
  next: RateLimitEntry;
} {
  if (!existing || existing.resetAt <= now) {
    return {
      allowed: true,
      retryAfterSec: 0,
      next: { count: 1, resetAt: now + windowMs },
    };
  }
  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      next: existing,
    };
  }
  return {
    allowed: true,
    retryAfterSec: 0,
    next: { ...existing, count: existing.count + 1 },
  };
}

export function reserveBudget(
  existing: DailyBudget | undefined,
  date: string,
  estimatedUsd: number,
  limitUsd: number
): {
  allowed: boolean;
  usedUsd: number;
  next: DailyBudget;
} {
  const current =
    existing?.date === date ? existing : { date, reservedUsd: 0 };
  if (current.reservedUsd + estimatedUsd > limitUsd) {
    return { allowed: false, usedUsd: current.reservedUsd, next: current };
  }

  const next = {
    date,
    reservedUsd: current.reservedUsd + estimatedUsd,
  };
  return { allowed: true, usedUsd: next.reservedUsd, next };
}
