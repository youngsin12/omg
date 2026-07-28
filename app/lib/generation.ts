export type GenerationMode = "preview" | "standard" | "pro";

export const DEFAULT_GENERATION_MODE: GenerationMode = "preview";

export interface GeminiModelOption {
  id: GenerationMode;
  model: string;
  label: string;
  description: string;
  imageSize: "1K" | "2K";
  estimatedUsd: number;
}

export const GEMINI_MODEL_OPTIONS: Record<GenerationMode, GeminiModelOption> = {
  preview: {
    id: "preview",
    model: "gemini-3.1-flash-lite-image",
    label: "빠른 미리보기",
    description: "Flash Lite · 1K · 가장 저렴함",
    imageSize: "1K",
    estimatedUsd: 0.0336,
  },
  standard: {
    id: "standard",
    model: "gemini-3.1-flash-image",
    label: "표준 이미지",
    description: "Flash · 2K · 품질과 비용의 균형",
    imageSize: "2K",
    estimatedUsd: 0.101,
  },
  pro: {
    id: "pro",
    model: "gemini-3-pro-image",
    label: "고화질",
    description: "Pro · 2K · 복잡한 화보용",
    imageSize: "2K",
    estimatedUsd: 0.134,
  },
};

export const GENERATION_MODES = Object.keys(
  GEMINI_MODEL_OPTIONS
) as GenerationMode[];

export function isGenerationMode(value: unknown): value is GenerationMode {
  return (
    typeof value === "string" &&
    GENERATION_MODES.includes(value as GenerationMode)
  );
}
