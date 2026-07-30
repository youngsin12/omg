"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

export interface SavedPhoto {
  id: string;
  storagePath: string;
  signedUrl: string;
  styleId: string;
  model: string;
  createdAt: string;
}

export default function SavedPhotos({
  initialPhotos,
}: {
  initialPhotos: SavedPhoto[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deletePhoto = async (photo: SavedPhoto) => {
    if (!window.confirm("이 사진을 Supabase에서 영구 삭제할까요?")) return;

    setDeletingId(photo.id);
    setError(null);
    const supabase = createClient();

    try {
      const { error: storageError } = await supabase.storage
        .from("proshot-photos")
        .remove([photo.storagePath]);
      if (storageError) throw storageError;

      const { error: recordError } = await supabase
        .from("photo_assets")
        .delete()
        .eq("id", photo.id);
      if (recordError) throw recordError;

      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "사진 삭제 중 오류가 발생했습니다."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        아직 저장한 사진이 없습니다. 생성 결과에서 원하는 사진만 저장할 수 있어요.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-600">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <article
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.signedUrl}
              alt="저장된 ProShot 결과"
              className="aspect-[3/4] w-full object-cover"
            />
            <div className="p-3">
              <p className="truncate text-xs font-bold text-slate-700">
                {photo.styleId}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-400">
                {photo.model}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {new Date(photo.createdAt).toLocaleDateString("ko-KR")}
              </p>
              <button
                type="button"
                onClick={() => deletePhoto(photo)}
                disabled={deletingId === photo.id}
                className="mt-3 w-full rounded-lg bg-rose-50 px-2 py-2 text-xs font-bold text-rose-600 disabled:text-slate-400"
              >
                {deletingId === photo.id ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
