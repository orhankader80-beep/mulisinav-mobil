import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import * as API from "@/src/api";
import { queryClient } from "@/src/query-client";

type Ctx = {
  user: API.User | null | false; // null = loading, false = signed out
  offline: boolean;
  signIn: (mode: "login" | "register", body: Record<string, string>) => Promise<API.User>;
  signOut: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<API.User | null | false>(null);
  const [offline, setOffline] = useState(false);

  const restore = useCallback(async () => {
    setUser(null);
    setOffline(false);
    try {
      setUser((await API.restoreSession()) ?? false);
    } catch {
      setOffline(true);
      setUser(false);
    }
  }, []);

  useEffect(() => {
    restore();
    API.setAuthLostHandler(() => setUser(false));
    return () => API.setAuthLostHandler(null);
  }, [restore]);

  const signIn = async (mode: "login" | "register", body: Record<string, string>) => {
    const u = await API.authenticate(mode, body);
    setUser(u);
    return u;
  };

  const signOut = async () => {
    await API.logout();
    queryClient.clear();
    setUser(false);
  };

  return <AuthContext.Provider value={{ user, offline, signIn, signOut, retry: restore }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
