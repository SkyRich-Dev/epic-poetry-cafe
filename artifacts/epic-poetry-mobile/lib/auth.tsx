import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, getToken, setToken, setUnauthorizedHandler } from "./api";

export type Role = "admin" | "manager" | "viewer";

export interface AuthUser {
  id: number;
  username: string;
  fullName?: string | null;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadFromToken = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getToken();
      if (!t) {
        setUser(null);
        return;
      }
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromToken();
  }, [loadFromToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>(
      "/auth/login",
      { username, password },
    );
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
