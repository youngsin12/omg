import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GENERATION_MODE,
  GEMINI_MODEL_OPTIONS,
  isGenerationMode,
} from "../app/lib/generation.ts";
import { parseImageDataUrl } from "../app/lib/generation.server.ts";
import {
  consumeRateLimitEntry,
  reserveBudget,
} from "../app/lib/usageGuards.server.ts";
import {
  getDefaultStyleIdForCategory,
  getStyle,
} from "../app/lib/styles.ts";

test("Flash Lite preview always uses 1K and each mode maps to one model", () => {
  assert.equal(DEFAULT_GENERATION_MODE, "preview");
  assert.equal(GEMINI_MODEL_OPTIONS.preview.imageSize, "1K");
  assert.equal(
    GEMINI_MODEL_OPTIONS.preview.model,
    "gemini-3.1-flash-lite-image"
  );
  assert.equal(GEMINI_MODEL_OPTIONS.standard.imageSize, "2K");
  assert.equal(GEMINI_MODEL_OPTIONS.pro.imageSize, "2K");
  assert.equal(
    new Set(Object.values(GEMINI_MODEL_OPTIONS).map((option) => option.model))
      .size,
    3
  );
});

test("generation mode rejects unsupported client values", () => {
  assert.equal(isGenerationMode("preview"), true);
  assert.equal(isGenerationMode("standard"), true);
  assert.equal(isGenerationMode("pro"), true);
  assert.equal(isGenerationMode("unknown"), false);
  assert.equal(isGenerationMode(null), false);
});

test("each visible category resolves to a valid lightweight default style", () => {
  for (const category of ["business", "id", "fun"]) {
    const styleId = getDefaultStyleIdForCategory(category);
    assert.equal(getStyle(styleId)?.category, category);
  }
  assert.equal(getDefaultStyleIdForCategory("custom"), "custom");
});

test("image parser accepts a correctly signed PNG data URL", () => {
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const parsed = parseImageDataUrl(
    `data:image/png;base64,${pngSignature.toString("base64")}`
  );

  assert.equal(parsed.mimeType, "image/png");
  assert.equal(parsed.byteLength, pngSignature.length);
});

test("image parser rejects MIME spoofing and unsupported SVG", () => {
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  assert.throws(
    () =>
      parseImageDataUrl(
        `data:image/png;base64,${jpegBytes.toString("base64")}`
      ),
    /파일 내용과 이미지 형식/
  );
  assert.throws(
    () => parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
    /JPEG, PNG, WebP/
  );
});

test("image parser enforces decoded byte limit", () => {
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
  assert.throws(
    () =>
      parseImageDataUrl(
        `data:image/jpeg;base64,${jpegBytes.toString("base64")}`,
        4
      ),
    /8MB 이하/
  );
});

test("rate limit blocks the request at the configured boundary", () => {
  const blocked = consumeRateLimitEntry(
    { count: 5, resetAt: 11_000 },
    10_000,
    5,
    10_000
  );
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 1);

  const reset = consumeRateLimitEntry(blocked.next, 11_000, 5, 10_000);
  assert.equal(reset.allowed, true);
  assert.equal(reset.next.count, 1);
});

test("daily budget rejects a request that would exceed the limit", () => {
  const first = reserveBudget(undefined, "2026-07-27", 0.101, 0.2);
  assert.equal(first.allowed, true);

  const blocked = reserveBudget(first.next, "2026-07-27", 0.101, 0.2);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.usedUsd, 0.101);

  const nextDay = reserveBudget(first.next, "2026-07-28", 0.101, 0.2);
  assert.equal(nextDay.allowed, true);
  assert.equal(nextDay.usedUsd, 0.101);
});
