'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AmbientSky } from '@/components/fx/AmbientSky';
import { RouteCurtain } from '@/components/fx/RouteCurtain';
import { VisitTracker } from '@/components/analytics/VisitTracker';
import { UiLookScope } from '@/components/ui/UiLookScope';
import { IdeaButton } from '@/components/ideas/IdeaButton';
import { TrialProvider } from '@/components/trial/TrialProvider';
import { MembershipProvider } from '@/components/membership/MembershipProvider';
import { TourProvider } from '@/components/tour/TourProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ToastProvider>
          <MembershipProvider>
              <TrialProvider>
                <TourProvider>
                  <AmbientSky />
                  {children}
                  <RouteCurtain />
                  <IdeaButton />
                  <VisitTracker />
                  <UiLookScope />
                </TourProvider>
              </TrialProvider>
          </MembershipProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
