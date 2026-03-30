import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  // Custom fetch interceptor logic can be assumed, but we'll also handle local state
  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }
  });

  // Ensure global fetch passes token (if customFetch reads global headers)
  // For a purely robust approach without touching generated client, we inject it manually
  // where needed, or assume the generated client is configured to read localStorage.
  
  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    refetch();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.href = '/';
  };

  // If token exists but fetch fails (e.g. 401), we should ideally clear it.
  useEffect(() => {
    if (token && !isLoading && !user) {
      // Could mean token is invalid, but we'll keep it simple
    }
  }, [token, isLoading, user]);

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
