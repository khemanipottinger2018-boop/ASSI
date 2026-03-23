import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles/globals.css';

import { ThemeProvider }    from '@/components/shared/themes/core/ThemeProvider';
import { AuthProvider }     from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { FeaturesProvider } from '@/contexts/FeaturesContext';
import { SocketProvider }   from '@/contexts/SocketContext';

import AnimatedGradient from '@/components/shared/themes/visuals/AnimatedGradient';
import FloatingBlobs    from '@/components/shared/themes/visuals/FloatingBlobs';
import AppShell         from '@/components/AppShell';

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