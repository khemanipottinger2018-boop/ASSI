import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles/globals.css';

import { ThemeProvider }    from '@/features/themes/core/ThemeProvider';
import { AuthProvider }     from '@/features/auth';
import { SettingsProvider } from '@/features/settings';
import { FeaturesProvider } from '@/features/platform';
import { SocketProvider }   from '@/features/socket';

import AnimatedGradient from '@/features/themes/visuals/AnimatedGradient';
import FloatingBlobs    from '@/features/themes/visuals/FloatingBlobs';
import AppShell         from '@/features/nav/AppShell';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title:       'ASSI',
  description: 'Get instant help from AI or live tutors. Built for Caribbean students.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>

          {/*
            THEME LAYER — fixed background, z-index 0.
            NO isolation:isolate — position:fixed children
            (Vignette z:9, GrainOverlay z:10) escape any
            isolation boundary and live in body stacking context.
            ui-layer must use z-index:11 to beat them both.
          */}
          <div className="theme-layer">
            <AnimatedGradient />
            <FloatingBlobs />
          </div>

          <AuthProvider>
            <SocketProvider>
              <SettingsProvider>
                <FeaturesProvider>
                  {/*
                    UI LAYER — z-index:11 beats Vignette(9) + Grain(10).
                    100dvh uses dynamic viewport height (mobile safe).
                  */}
                  <div className="ui-layer" style={{ height: '100dvh', width: '100vw', overflow: 'hidden' }}>
                    <AppShell>{children}</AppShell>
                  </div>
                </FeaturesProvider>
              </SettingsProvider>
            </SocketProvider>
          </AuthProvider>

        </ThemeProvider>
      </body>
    </html>
  );
}