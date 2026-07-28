"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import {
  BG_COLORS,
  CATEGORIES,
  STYLES,
  getDefaultStyleIdForCategory,
  getStyle,
  type BgColor,
  type CategoryId,
} from "../lib/styles";
import {
  DEFAULT_GENERATION_MODE,
  GEMINI_MODEL_OPTIONS,
  GENERATION_MODES,
  type GenerationMode,
} from "../lib/generation";
import { PRINT_SIZES, generatePhotoSheet, type PrintSize } from "../lib/photoSheet";
import CompareSlider from "./CompareSlider";

interface GenerationResult {
  imageUrl: string;
  timeSec: string;
  mode: GenerationMode;
  model: string;
  modelLabel: string;
  imageSize: "1K" | "2K";
  estimatedUsd: number;
}

const LOADING_MESSAGES = [
  "조명을 세팅하고 있어요 💡",
  "베스트 각도를 찾는 중이에요 📐",
  "의상을 다림질하고 있어요 👔",
  "포토그래퍼가 셔터를 누르는 중 📸",
  "미세 보정으로 마무리하는 중 ✨",
];

const FUN_STYLE_IDS = STYLES.filter((s) => s.category === "fun").map((s) => s.id);

export default function UploadCard() {
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>("business");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("corporate");
  const [bgColor, setBgColor] = useState<BgColor>("white");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>(DEFAULT_GENERATION_MODE);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [usedStyleId, setUsedStyleId] = useState<string>("corporate");
  const [printSizeId, setPrintSizeId] = useState<string>(PRINT_SIZES[1].id);
  const [isSheetGenerating, setIsSheetGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate fun loading messages
  useEffect(() => {
    if (!isLoading) return;
    setLoadingMsgIdx(0);
    const timer = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isLoading]);

  const stylesInCategory = useMemo(
    () => STYLES.filter((s) => s.category === category),
    [category]
  );

  const selectedStyle = getStyle(selectedStyleId);
  const usedStyle = getStyle(usedStyleId);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const processFile = (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("JPEG, PNG, WebP 이미지 파일만 업로드할 수 있습니다.");
      setSelfieBase64(null);
      setFileName(null);
      return;
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("파일 크기는 8MB 이하만 업로드 가능합니다.");
      setSelfieBase64(null);
      setFileName(null);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setSelfieBase64(reader.result);
      } else {
        setError("파일을 읽는 도중 오류가 발생했습니다.");
      }
    };
    reader.onerror = () => {
      setError("파일을 읽는 도중 오류가 발생했습니다.");
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelfieBase64(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectCategory = (id: CategoryId) => {
    setCategory(id);
    setSelectedStyleId(getDefaultStyleIdForCategory(id));
  };

  const pickRandomFunStyle = () => {
    const pool = FUN_STYLE_IDS.filter((id) => id !== selectedStyleId);
    const picked = pool[Math.floor(Math.random() * pool.length)] ?? FUN_STYLE_IDS[0];
    setCategory("fun");
    setSelectedStyleId(picked);
  };

  const handleSubmit = async () => {
    if (!selfieBase64) return;
    if (selectedStyleId === "custom" && !customPrompt.trim()) {
      setError("커스텀 스타일 설명을 입력해 주세요. (예: 우주비행사 슈트를 입고 은하수 배경 앞에서)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: selfieBase64,
          styleId: selectedStyleId,
          bgColor,
          customPrompt: selectedStyleId === "custom" ? customPrompt.trim() : undefined,
          mode: generationMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI 이미지 생성 중 오류가 발생했습니다.");
      }

      setUsedStyleId(selectedStyleId);
      setResult(data.result);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "네트워크 연결 오류가 발생했거나 서버에 접근할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (imageUrl: string, label: string) => {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], `proshot_${usedStyleId}.png`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `ProShot — ${label}`,
          text: "ProShot AI로 만든 내 프로필 사진 📸",
          files: [file],
        });
      } else {
        await navigator.clipboard?.write?.([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        alert("이미지가 클립보드에 복사되었습니다. 원하는 곳에 붙여넣기 하세요!");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      alert("이 브라우저에서는 공유하기가 지원되지 않습니다. 다운로드 버튼을 이용해 주세요.");
    }
  };

  const handleSheetDownload = async () => {
    if (!result) return;
    const size = PRINT_SIZES.find((s) => s.id === printSizeId) ?? PRINT_SIZES[1];

    setIsSheetGenerating(true);
    try {
      const { dataUrl, count } = await generatePhotoSheet(result.imageUrl, size);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `proshot_sheet_${size.id}_${count}cut.png`;
      a.click();
    } catch (err) {
      console.error(err);
      setError("인화용 시트 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSheetGenerating(false);
    }
  };

  const resetForNewStyle = () => {
    setResult(null);
    setError(null);
    // keep the selfie — user just wants a different style
  };

  const resetAll = () => {
    setResult(null);
    setSelfieBase64(null);
    setFileName(null);
    setError(null);
    setCustomPrompt("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ─────────────────────────── 1. Loading State ───────────────────────────
  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white/90 backdrop-blur-md rounded-2xl border border-slate-100 p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center justify-center min-h-[380px]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">
            {selectedStyle?.emoji ?? "✨"}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2 transition-all">
          {LOADING_MESSAGES[loadingMsgIdx]}
        </h3>
        <p className="text-slate-400 text-xs text-center max-w-xs leading-relaxed">
          {GEMINI_MODEL_OPTIONS[generationMode].label} 모델 하나로{" "}
          <span className="font-bold text-indigo-500">
            {selectedStyleId === "custom" ? "커스텀 스타일" : selectedStyle?.label}
          </span>{" "}
          사진을 생성하고 있습니다. 선택한 품질에 따라 시간이 달라질 수 있어요.
        </p>
      </div>
    );
  }

  // ─────────────────────────── 2. Result View ───────────────────────────
  if (result) {
    const usedLabel = usedStyleId === "custom" ? "커스텀 스타일" : usedStyle?.label ?? "헤드샷";
    const isPrintable = usedStyle?.printable ?? false;

    return (
      <div className="w-full max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 p-6 sm:p-8 md:p-10 shadow-2xl shadow-slate-300/40">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3 shadow-sm">
            {usedStyle?.emoji ?? "✨"} {usedLabel} 완성!
          </span>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {result.modelLabel} 결과
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Gemini 모델 하나만 호출해 비용 중복을 막았습니다.
          </p>
        </div>

        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 flex flex-col items-center shadow-sm mb-8 max-w-md mx-auto">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-sm font-bold px-3 py-1 rounded-xl text-indigo-700 bg-indigo-50">
              {result.modelLabel}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {result.imageSize} · {result.model}
            </span>
          </div>
          <div className="relative w-full aspect-[3/4] max-w-[280px] rounded-xl overflow-hidden shadow-md border-2 border-white ring-4 ring-slate-100 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={`${usedLabel} 결과`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full grid grid-cols-2 gap-2 text-center mb-5">
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">⚡ 소요 시간</p>
              <p className="text-sm font-black text-slate-800">{result.timeSec}초</p>
            </div>
            <div className="bg-white rounded-xl p-2.5 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold mb-0.5">💰 예상 API 비용</p>
              <p className="text-sm font-black text-emerald-600">
                ${result.estimatedUsd.toFixed(4)}
              </p>
              <p className="text-[9px] text-slate-300 font-bold mt-0.5">
                입력 토큰·환율에 따라 달라질 수 있음
              </p>
            </div>
          </div>
          <div className="w-full flex gap-2">
            <a
              href={result.imageUrl}
              download={`proshot_${result.mode}_${usedStyleId}.png`}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
            >
              다운로드
            </a>
            <button
              onClick={() => handleShare(result.imageUrl, usedLabel)}
              className="bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 text-xs font-bold py-3 px-4 rounded-xl transition-colors"
            >
              공유
            </button>
          </div>
        </div>

        {/* Before / After Slider */}
        {selfieBase64 && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">
                비포 · 애프터 비교
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">가운데 핸들을 좌우로 움직여 보세요</p>
            </div>
            <div className="max-w-[320px] mx-auto">
              <CompareSlider
                beforeSrc={selfieBase64}
                afterSrc={result.imageUrl}
                beforeLabel="원본 셀카"
                afterLabel={usedLabel}
              />
            </div>
          </div>
        )}

        {/* Print Sheet Generator — only for ID-type styles */}
        {isPrintable && (
          <div className="mb-8 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/60 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🖨️</span>
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">인화용 시트 만들기</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              4×6인치(사진관 표준 인화지) 300dpi 시트에 규격 사이즈로 자동 배치하고 재단선까지 그려 드려요.
              다운로드한 파일을 사진관·편의점 인화 키오스크에서 그대로 출력하면 끝!
            </p>
            {usedStyleId === "passport" && (
              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 leading-relaxed">
                제출 전 해당 국가·기관의 최신 여권사진 규격을 반드시 확인하세요.
                AI 생성 결과는 공식 규격 준수를 보장하지 않습니다.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 grid grid-cols-3 gap-2">
                {PRINT_SIZES.map((size: PrintSize) => {
                  const isSelected = printSizeId === size.id;
                  return (
                    <button
                      key={size.id}
                      onClick={() => setPrintSizeId(size.id)}
                      className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-white text-indigo-700 shadow-sm"
                          : "border-slate-200/80 bg-white/60 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-[11px] font-extrabold leading-tight">{size.label}</span>
                      <span className="block text-[9px] font-medium mt-0.5 opacity-70">{size.note}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleSheetDownload}
                disabled={isSheetGenerating}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/10 whitespace-nowrap"
              >
                {isSheetGenerating ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    생성 중...
                  </span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    시트 다운로드
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 border-t border-slate-100 pt-6">
          <button
            onClick={resetForNewStyle}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all duration-200 active:scale-[0.98] text-sm flex items-center justify-center gap-2"
          >
            🎨 같은 사진으로 다른 스타일 만들기
          </button>
          <button
            onClick={resetAll}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-8 rounded-xl transition-all duration-200 active:scale-[0.98] text-sm"
          >
            새 사진으로 시작
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────── 3. Form View ───────────────────────────
  return (
    <div className="mx-auto w-full min-w-0 max-w-xl rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:p-8">
      {/* File Upload Dropzone */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">셀카 사진 업로드</label>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <div
          onClick={triggerFileInput}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[190px] ${
            isDragging
              ? "border-indigo-600 bg-indigo-50/20"
              : selfieBase64
              ? "border-emerald-200 bg-emerald-50/5"
              : "border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/5"
          }`}
        >
          {selfieBase64 ? (
            <div className="w-full flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-md border-2 border-white ring-4 ring-emerald-500/10 mb-3 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfieBase64}
                  alt="셀카 프리뷰"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemove}
                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="사진 삭제"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate max-w-xs mb-1">{fileName}</p>
              <button
                onClick={handleRemove}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 underline underline-offset-2"
              >
                다른 사진으로 변경
              </button>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                기기에 저장된 사진 업로드
              </p>
              <p className="text-xs text-slate-400 mb-2">
                여기를 클릭하거나 파일을 여기에 드래그하세요
              </p>
              <p className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                JPEG, PNG, WebP 파일 (최대 8MB)
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl animate-shake">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-bold text-slate-700">
            어디에 쓸 사진인가요?
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100/70 p-1.5 sm:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`rounded-xl py-2 px-1 text-center transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-700 font-bold"
                }`}
              >
                <span className="block text-base leading-none mb-1">{cat.emoji}</span>
                <span className="block text-[11px] tracking-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 font-medium mt-2 pl-1">
          용도만 골라도 추천 스타일로 바로 만들 수 있어요.
        </p>
      </div>

      {category === "custom" && (
        <div className="mb-6">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="예) 우주비행사 슈트를 입고 은하수를 배경으로"
            className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50/40 p-4 text-sm text-slate-700 placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between px-1">
            <p className="text-[11px] text-slate-400">
              얼굴을 유지하면서 원하는 모습을 설명하세요.
            </p>
            <span className="text-[11px] font-bold text-slate-300">
              {customPrompt.length}/500
            </span>
          </div>
        </div>
      )}

      <details className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/40">
        <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-600">
          세부 설정 · {selectedStyle?.label ?? "추천 스타일"} ·{" "}
          {GEMINI_MODEL_OPTIONS[generationMode].label}
        </summary>
        <div className="space-y-5 border-t border-slate-100 p-4">
          {category !== "custom" && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  세부 스타일
                </p>
                {category === "fun" && (
                  <button
                    type="button"
                    onClick={pickRandomFunStyle}
                    className="text-[11px] font-bold text-indigo-600"
                  >
                    🎲 랜덤 추천
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stylesInCategory.map((style) => {
                  const isSelected = selectedStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyleId(style.id)}
                      className={`rounded-xl border-2 p-2.5 text-center transition-colors ${
                        isSelected
                          ? "border-indigo-600 bg-white text-indigo-700"
                          : "border-slate-100 bg-white/60 text-slate-500"
                      }`}
                    >
                      <span className="block text-xl">{style.emoji}</span>
                      <span className="mt-1 block text-[11px] font-bold leading-tight">
                        {style.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedStyle?.supportsBgColor && (
            <div>
              <p className="mb-2.5 text-xs font-bold text-slate-700">배경색</p>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((bg) => {
                  const isSelected = bgColor === bg.id;
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgColor(bg.id)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-bold ${
                        isSelected
                          ? "border-indigo-600 bg-white text-indigo-700"
                          : "border-slate-100 bg-white/60 text-slate-500"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: bg.swatch }}
                      />
                      {bg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2.5 text-xs font-bold text-slate-700">이미지 품질</p>
          <p className="mb-3 text-[11px] leading-5 text-slate-500">
            기본값은 비용이 가장 낮은 빠른 미리보기입니다. 더 큰 이미지가
            필요할 때만 품질을 변경하세요.
          </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {GENERATION_MODES.map((mode) => {
            const option = GEMINI_MODEL_OPTIONS[mode];
            const isSelected = generationMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setGenerationMode(mode)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/30 text-indigo-700 shadow-sm"
                    : "border-slate-100 bg-slate-50/30 text-slate-600 hover:border-slate-200"
                }`}
              >
                <span className="block text-xs font-extrabold mb-1">
                  {option.label}
                </span>
                <span className="block text-[10px] leading-tight opacity-75">
                  {option.description}
                </span>
                <span className="block text-[10px] font-bold mt-2">
                  예상 ${option.estimatedUsd.toFixed(4)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          한 번의 요청에는 선택한 Gemini 모델 하나만 호출됩니다.
        </p>
          </div>
        </div>
      </details>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selfieBase64}
        className="w-full relative group inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-base py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-indigo-500/15 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden active:scale-[0.98] disabled:active:scale-100"
      >
        <span className="relative z-10 flex items-center gap-1.5">
          <span>
            {selectedStyle?.emoji ?? "✨"}{" "}
            {selectedStyleId === "custom" ? "커스텀 스타일" : selectedStyle?.label} 생성하기
          </span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:hidden" />
      </button>
    </div>
  );
}
