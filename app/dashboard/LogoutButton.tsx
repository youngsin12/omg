"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setError("");
    setLoading(true);

    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "로그아웃을 완료하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
      >
        {loading ? "로그아웃 중…" : "로그아웃"}
      </button>
      {error ? (
        <p className="mt-3 text-sm leading-6 text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
