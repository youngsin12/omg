import "server-only";

import { createClient } from "@supabase/supabase-js";

export type SupabaseConnectionStatus =
  | { status: "connected"; checkedAt: string }
  | { status: "not_configured" | "unavailable" };

export async function getSupabaseConnectionStatus(): Promise<SupabaseConnectionStatus> {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return { status: "not_configured" };
  }

  const supabase = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase
    .from("proshot_connection_checks")
    .select("status, checked_at")
    .eq("id", 1)
    .single();

  if (error || data?.status !== "ready") {
    return { status: "unavailable" };
  }

  return {
    status: "connected",
    checkedAt: String(data.checked_at),
  };
}
