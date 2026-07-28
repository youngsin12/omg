"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
    >
      {loading ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
