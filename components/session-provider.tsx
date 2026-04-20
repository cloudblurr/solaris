'use client';

/**
 * components/session-provider.tsx
 * NextAuth session provider wrapper.
 */

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
