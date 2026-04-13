import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles/globals.css';

import { Suspense } from 'react';

import { ThemeProvider } from '@/features/themes/core/ThemeProvider';
import { AuthProvider } from '@/features/auth';
import { ViewContextProvider } from '@/features/admin';
import { SettingsProvider } from '@/features/settings';
import { FeaturesProvider } from '@/features/platform';
import { SocketProvider } from '@/features/socket';
import { NotificationsProvider } from '@/features/notifications';

import AnimatedGradient from '@/features/themes/visuals/AnimatedGradient';
import FloatingBlobs from '@/features/themes/visuals/FloatingBlobs';
import AppShell from '@/features/nav/AppShell';
import { BootGate } from '@/features/boot';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ASSI',
  description: 'Get instant help from AI or live tutors. Built for Caribbean students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {/* Theme Layer - Background elements */}
          <div className="theme-layer">
            <AnimatedGradient />
            <FloatingBlobs />
          </div>

          {/* Main App Providers + Suspense Boundary */}
          <Suspense fallback={null}>
            <AuthProvider>
              <ViewContextProvider>
                <SocketProvider>
                  <NotificationsProvider>
                    <SettingsProvider>
                      <FeaturesProvider>
                        {/* UI Layer */}
                        <div
                          className="ui-layer"
                          style={{
                            height: '100dvh',
                            width: '100vw',
                            overflow: 'hidden'
                          }}
                        >
                          <BootGate>
                            <AppShell>{children}</AppShell>
                          </BootGate>
                        </div>
                      </FeaturesProvider>
                    </SettingsProvider>
                  </NotificationsProvider>
                </SocketProvider>
              </ViewContextProvider>
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}