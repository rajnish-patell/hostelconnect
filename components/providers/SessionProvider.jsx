"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SessionContext = createContext({
  session: null,
  user: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active token refresh helper
  const handleTokenRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        router.refresh();
      }
    } catch (err) {
      console.warn("[SessionProvider]: Token refresh skipped", err);
    }
  }, [supabase, router]);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user || null);
        setLoading(false);
      }
    });

    // 2. Realtime Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    // 3. Keepalive Heartbeat: Check every 10 minutes and proactively refresh expiring tokens
    const interval = setInterval(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.expires_at) {
        const expiresInMs = s.expires_at * 1000 - Date.now();
        // If expires in less than 15 minutes, refresh proactively
        if (expiresInMs < 15 * 60 * 1000) {
          await handleTokenRefresh();
        }
      }
    }, 10 * 60 * 1000);

    // 4. Tab Visibility Auto-Refresh: Refresh if user returns to tab after a long pause
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.expires_at) {
          const expiresInMs = s.expires_at * 1000 - Date.now();
          if (expiresInMs < 15 * 60 * 1000) {
            await handleTokenRefresh();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, router, handleTokenRefresh]);

  return (
    <SessionContext.Provider value={{ session, user, loading, refresh: handleTokenRefresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
