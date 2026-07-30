import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logAuthEvent } from "../auth/log";
import { getSupabasePublicConfig } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (caughtError) {
          logAuthEvent("warn", "cookie_write_skipped", {
            errorMessage:
              caughtError instanceof Error ? caughtError.message : String(caughtError),
            reason: "server_component_cookie_store_readonly",
          });
          // Server Components cannot write cookies. Middleware refreshes them.
        }
      },
    },
  });
}
