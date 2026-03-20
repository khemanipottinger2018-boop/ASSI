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
          <AnimatedGradient />
          <FloatingBlobs />

          {/* Provider order matters:
              Auth first → Socket needs auth → Settings + Features need auth
              FeaturesProvider fetches /api/user/features on mount            */}
          <AuthProvider>
            <SocketProvider>
              <SettingsProvider>
                <FeaturesProvider>
                  <div className="h-screen w-screen overflow-hidden">
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