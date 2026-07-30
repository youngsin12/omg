import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { toErrorMessage } from "../auth/errors";
import { createRequestId, logAuthEvent } from "../auth/log";
import { getSupabasePublicConfig } from "./config";

export async function updateSession(request: NextRequest) {
  const requestId = createRequestId();
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isLogin = request.nextUrl.pathname === "/login";

  let response = NextResponse.next({ request });

  try {
    const { url, key } = getSupabasePublicConfig();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      throw error;
    }

    const isLoggedIn = Boolean(data?.claims?.sub);

    if (isDashboard && !isLoggedIn) {
      logAuthEvent("info", "dashboard_redirected_to_login", {
        requestId,
        pathname: request.nextUrl.pathname,
      });

      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isLogin && isLoggedIn) {
      logAuthEvent("info", "login_redirected_to_dashboard", {
        requestId,
        pathname: request.nextUrl.pathname,
      });

      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }

    return response;
  } catch (caughtError) {
    logAuthEvent("error", "session_check_failed", {
      requestId,
      pathname: request.nextUrl.pathname,
      errorMessage: toErrorMessage(caughtError),
    });

    if (isDashboard) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      loginUrl.searchParams.set("authError", "SESSION_CHECK_FAILED");
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }
}
