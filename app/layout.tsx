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
            ── THEME LAYER ───────────────────────────────────────────
            All theme visuals live here — gradient, blobs, vignette,
            grain overlay, seasonal effects.

            Key insight: position:fixed elements inside this div
            participate in the BODY stacking context directly, not
            this div's context. So their z-indexes (0–10) are global.

            FloatingBlobs internal z-indexes:
              blobs/effects:   0–1
              Vignette:        9
              GrainOverlay:   10   ← highest theme element

            .ui-layer must beat ALL of these → z-index: 11.
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
                    ── UI LAYER ──────────────────────────────────────
                    z-index: 11 beats GrainOverlay (10) and Vignette (9).
                    position: relative is required for z-index to apply.
                    100dvh uses dynamic viewport height (accounts for
                    mobile browser chrome correctly).

                    overflow: hidden prevents children from causing
                    body scroll — the ASSI chat and other pages manage
                    their own internal scroll.
                  */}
                  <div
                    className="ui-layer"
                    style={{
                      position: 'relative',
                      zIndex:   11,
                      height:   '100dvh',
                      width:    '100vw',
                      overflow: 'hidden',
                    }}
                  >
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