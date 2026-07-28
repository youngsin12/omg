import { createHash, randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import {
  GEMINI_MODEL_OPTIONS,
  isGenerationMode,
  type GenerationMode,
} from "../../lib/generation";
import { parseImageDataUrl } from "../../lib/generation.server";
import { buildPrompt, getStyle, type BgColor } from "../../lib/styles";
import {
  consumeRateLimitEntry,
  reserveBudget,
  type DailyBudget,
  type RateLimitEntry,
} from "../../lib/usageGuards.server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 11 * 1024 * 1024;
const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_DAILY_BUDGET_USD = 5;
const VALID_BG_COLORS: BgColor[] = ["white", "blue", "gray"];

declare global {
  // These guards are intentionally process-local for pre-deployment validation.
  var proshotRateLimits: Map<string, RateLimitEntry> | undefined;
  var proshotDailyBudget: DailyBudget | undefined;
}

const rateLimits =
  globalThis.proshotRateLimits ??
  (globalThis.proshotRateLimits = new Map<string, RateLimitEntry>());

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 12);
}

function consumeRateLimit(key: string, now = Date.now()): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const max = numberFromEnv("GENERATION_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX);
  const windowMs = numberFromEnv(
    "GENERATION_RATE_LIMIT_WINDOW_MS",
    DEFAULT_RATE_LIMIT_WINDOW_MS
  );
  const existing = rateLimits.get(key);
  const result = consumeRateLimitEntry(existing, now, max, windowMs);
  rateLimits.set(key, result.next);
  return { allowed: result.allowed, retryAfterSec: result.retryAfterSec };
}

function koreaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function reserveDailyBudget(estimatedUsd: number): {
  allowed: boolean;
  usedUsd: number;
  limitUsd: number;
} {
  const date = koreaDate();
  const limitUsd = numberFromEnv(
    "GENERATION_DAILY_BUDGET_USD",
    DEFAULT_DAILY_BUDGET_USD
  );

  const result = reserveBudget(
    globalThis.proshotDailyBudget,
    date,
    estimatedUsd,
    limitUsd
  );
  globalThis.proshotDailyBudget = result.next;
  return { allowed: result.allowed, usedUsd: result.usedUsd, limitUsd };
}

function logGeneration(
  event: "blocked" | "completed" | "failed",
  fields: Record<string, string | number | boolean>
) {
  console.info(
    JSON.stringify({
      scope: "proshot.generate",
      event,
      timestamp: new Date().toISOString(),
      ...fields,
    })
  );
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function toUserMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("not found") || message.includes("404")) {
    return "선택한 모델을 사용할 수 없습니다. 관리자에게 문의하세요.";
  }
  if (message.includes("quota") || message.includes("429")) {
    return "서비스 호출 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "AI 사진 생성 중 오류가 발생했습니다. 다시 시도해 주세요.";
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const clientId = clientKey(req);
  const requestLength = Number(req.headers.get("content-length") ?? 0);

  if (requestLength > MAX_REQUEST_BYTES) {
    return jsonError("요청 크기가 너무 큽니다.", 413);
  }

  const rateLimit = consumeRateLimit(clientId);
  if (!rateLimit.allowed) {
    logGeneration("blocked", {
      requestId,
      clientId,
      reason: "rate_limit",
      retryAfterSec: rateLimit.retryAfterSec,
    });
    return jsonError(
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      429,
      { "Retry-After": String(rateLimit.retryAfterSec) }
    );
  }

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return jsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const input = body as Record<string, unknown>;
    const styleId =
      typeof input.styleId === "string" ? input.styleId : "corporate";
    const rawCustomPrompt =
      typeof input.customPrompt === "string" ? input.customPrompt : undefined;
    const bgColor = input.bgColor;
    if (input.mode !== undefined && !isGenerationMode(input.mode)) {
      return jsonError("지원하지 않는 품질 옵션입니다.", 400);
    }
    const mode: GenerationMode = isGenerationMode(input.mode)
      ? input.mode
      : "standard";

    if (styleId === "custom") {
      const customPrompt = rawCustomPrompt?.trim() ?? "";
      if (!customPrompt) {
        return jsonError("커스텀 스타일 설명을 입력해 주세요.", 400);
      }
      if (customPrompt.length > 500) {
        return jsonError("커스텀 스타일 설명은 500자 이내로 입력해 주세요.", 400);
      }
    } else if (!getStyle(styleId)) {
      return jsonError("지원하지 않는 스타일입니다.", 400);
    }

    if (
      bgColor !== undefined &&
      (typeof bgColor !== "string" ||
        !VALID_BG_COLORS.includes(bgColor as BgColor))
    ) {
      return jsonError("지원하지 않는 배경색입니다.", 400);
    }

    let image;
    try {
      image = parseImageDataUrl(input.imageBase64);
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "이미지가 올바르지 않습니다.",
        400
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonError("서버 설정 오류: API 키가 구성되지 않았습니다.", 500);
    }

    const modelOption = GEMINI_MODEL_OPTIONS[mode];
    const budget = reserveDailyBudget(modelOption.estimatedUsd);
    if (!budget.allowed) {
      logGeneration("blocked", {
        requestId,
        clientId,
        reason: "daily_budget",
        mode,
        model: modelOption.model,
        budgetUsedUsd: Number(budget.usedUsd.toFixed(4)),
        budgetLimitUsd: budget.limitUsd,
      });
      return jsonError(
        "오늘의 생성 비용 한도에 도달했습니다. 관리자에게 문의하세요.",
        429
      );
    }

    const prompt = buildPrompt({
      styleId,
      bgColor: bgColor as BgColor | undefined,
      customPrompt: rawCustomPrompt,
    });
    const ai = new GoogleGenAI({ apiKey });
    const startedAt = Date.now();

    try {
      const interaction = await ai.interactions.create({
        model: modelOption.model,
        input: [
          { type: "text", text: prompt },
          {
            type: "image",
            data: image.rawBase64,
            mime_type: image.mimeType,
          },
        ],
        response_format: {
          type: "image",
          aspect_ratio: "3:4",
          image_size: modelOption.imageSize,
        },
      });

      const durationMs = Date.now() - startedAt;
      const outputImage = interaction?.output_image?.data;
      if (!outputImage) {
        throw new Error("결과 이미지가 응답에 존재하지 않습니다.");
      }

      logGeneration("completed", {
        requestId,
        clientId,
        mode,
        model: modelOption.model,
        imageSize: modelOption.imageSize,
        styleId,
        inputBytes: image.byteLength,
        durationMs,
        estimatedUsd: modelOption.estimatedUsd,
        success: true,
      });

      return NextResponse.json({
        result: {
          imageUrl: `data:image/png;base64,${outputImage}`,
          timeSec: (durationMs / 1000).toFixed(1),
          mode,
          model: modelOption.model,
          modelLabel: modelOption.label,
          imageSize: modelOption.imageSize,
          estimatedUsd: modelOption.estimatedUsd,
        },
      });
    } catch (error) {
      logGeneration("failed", {
        requestId,
        clientId,
        mode,
        model: modelOption.model,
        styleId,
        inputBytes: image.byteLength,
        durationMs: Date.now() - startedAt,
        estimatedUsd: modelOption.estimatedUsd,
        success: false,
      });
      return jsonError(toUserMessage(error), 502);
    }
  } catch (error) {
    console.error("Generate API Error:", { requestId, error });
    return jsonError("요청을 처리하는 중 서버 오류가 발생했습니다.", 500);
  }
}
