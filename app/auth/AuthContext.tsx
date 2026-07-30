"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createRequestId, logAuthEvent } from "../lib/auth/log";
import { createClient } from "../lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    const requestId = createRequestId();

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          setAuthError(`로그인 상태를 확인하지 못했습니다. 요청 ID: ${requestId}`);
          logAuthEvent("error", "session_check_failed", {
            requestId,
            errorMessage: error.message,
          });
          setUser(null);
          setLoading(false);
          return;
        }

        setAuthError("");
        setUser(data.user);
        setLoading(false);
      })
      .catch((caughtError) => {
        if (!active) {
          return;
        }

        setAuthError(`로그인 상태를 확인하지 못했습니다. 요청 ID: ${requestId}`);
        setUser(null);
        setLoading(false);
        logAuthEvent("error", "session_check_exception", {
          requestId,
          errorMessage:
            caughtError instanceof Error ? caughtError.message : String(caughtError),
        });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthError("");
      setUser(session?.user ?? null);
      setLoading(false);
      logAuthEvent("info", "auth_state_changed", {
        event,
        hasSession: Boolean(session),
        hasUser: Boolean(session?.user),
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    const requestId = createRequestId();
    const { error } = await supabase.auth.signOut();

    if (error) {
      logAuthEvent("error", "logout_failed", {
        requestId,
        errorMessage: error.message,
      });
      throw new Error(`로그아웃을 완료하지 못했습니다. 요청 ID: ${requestId}`);
    }

    logAuthEvent("info", "logout_completed", {
      requestId,
    });
    setAuthError("");
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
