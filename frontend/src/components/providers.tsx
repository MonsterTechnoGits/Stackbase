'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';
// @cli:if redux
import { Provider as ReduxProvider } from 'react-redux';
// @cli:endif

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeRippleProvider } from '@/contexts/ThemeRippleContext';
// @cli:if redux
import { store } from '@/store';
// @cli:endif

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return (
    /* @cli:if redux */
    <ReduxProvider store={store}>
      {/* @cli:endif */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeRippleProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </ThemeRippleProvider>
      </ThemeProvider>
      {/* @cli:if redux */}
    </ReduxProvider>
    /* @cli:endif */
  );
}
