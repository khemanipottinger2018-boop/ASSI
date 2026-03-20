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
            ┌─────────────────────────────────────────┐
            │  THEME LAYER                            │
            │  isolation: isolate creates a brand-new │
            │  stacking context — z-indexes inside    │
            │  this div are completely separate from  │
            │  the UI above. Snow, blobs, nebula etc  │
            │  can never bleed through app UI.        │
            └─────────────────────────────────────────┘
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
                    ui-layer sits above the theme-layer in the document.
                    position: relative + z-index: 1 is enough since
                    the theme-layer is isolated.
                  */}
                  <div className="ui-layer h-screen w-screen overflow-hidden">
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