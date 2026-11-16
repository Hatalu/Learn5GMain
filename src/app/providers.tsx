'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { VisitTracker } from '@/components/analytics/VisitTracker';
import { UiLookScope } from '@/components/ui/UiLookScope';
import { MembershipProvider } from '@/components/membership/MembershipProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ToastProvider>
          <MembershipProvider>
            {children}
            <VisitTracker />
            <UiLookScope />
          </MembershipProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
