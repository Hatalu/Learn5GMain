'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { CompanionProvider } from '@/components/companion/CompanionProvider';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RewardModal } from '@/components/companion/RewardModal';
import { AmbientSky } from '@/components/fx/AmbientSky';
import { RouteCurtain } from '@/components/fx/RouteCurtain';
import { VisitTracker } from '@/components/analytics/VisitTracker';
import { IdeaButton } from '@/components/ideas/IdeaButton';
import { TrialProvider } from '@/components/trial/TrialProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ToastProvider>
          <CompanionProvider>
            <TrialProvider>
              <AmbientSky />
              {children}
              <CompanionWidget />
              <RewardModal />
              <RouteCurtain />
              <IdeaButton />
              <VisitTracker />
            </TrialProvider>
          </CompanionProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
