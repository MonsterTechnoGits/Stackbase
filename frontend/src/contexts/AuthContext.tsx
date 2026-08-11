'use client';

import { createAuthClient } from 'better-auth/react';
import { createContext, useContext, type ReactNode } from 'react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  basePath: '/api/public/auth',
});

type SessionResult = ReturnType<typeof authClient.useSession>;

type AuthContextType = {
  authClient: typeof authClient;
  session: SessionResult;
};

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  return <AuthContext.Provider value={{ authClient, session }}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within AuthProvider');
  return ctx.session;
}
