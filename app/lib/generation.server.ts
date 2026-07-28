const MIME_SIGNATURES = {
  "image/jpeg": (bytes: Buffer) =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  "image/png": (bytes: Buffer) =>
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ),
  "image/webp": (bytes: Buffer) =>
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP",
} as const;

export type AllowedImageMime = keyof typeof MIME_SIGNATURES;

export interface ParsedImage {
  mimeType: AllowedImageMime;
  rawBase64: string;
  byteLength: number;
}

export function parseImageDataUrl(
  value: unknown,
  maxBytes = 8 * 1024 * 1024
): ParsedImage {
  if (typeof value !== "string") {
    throw new Error("셀카 사진을 먼저 업로드해 주세요.");
  }

  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/
  );
  if (!match) {
    throw new Error("JPEG, PNG, WebP 이미지 파일만 업로드할 수 있습니다.");
  }

  const mimeType = match[1] as AllowedImageMime;
  const rawBase64 = match[2];
  const bytes = Buffer.from(rawBase64, "base64");

  if (bytes.length === 0 || bytes.length > maxBytes) {
    throw new Error("이미지 파일은 8MB 이하만 업로드할 수 있습니다.");
  }
  if (
    bytes.toString("base64").replace(/=+$/, "") !==
    rawBase64.replace(/=+$/, "")
  ) {
    throw new Error("이미지 데이터가 올바른 Base64 형식이 아닙니다.");
  }
  if (!MIME_SIGNATURES[mimeType](bytes)) {
    throw new Error("파일 내용과 이미지 형식이 일치하지 않습니다.");
  }

  return { mimeType, rawBase64, byteLength: bytes.length };
}
