import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './styles/globals.css';

import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { SocketProvider } from '@/contexts/SocketContext';

import AnimatedGradient from '@/components/themes/AnimatedGradient';
import FloatingBlobs from '@/components/themes/FloatingBlobs';
import AppShell from '@/components/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ASSI',
  description:
    'Get instant help from AI or live tutors. Built for Caribbean students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {/* Background layers — fixed position, behind everything */}
          <AnimatedGradient />
          <FloatingBlobs />

          {/* Auth first, then Socket (needs auth), then Settings, then shell */}
          <AuthProvider>
            <SocketProvider>
              <SettingsProvider>
                <div className="h-screen w-screen overflow-hidden">
                  <AppShell>{children}</AppShell>
                </div>
              </SettingsProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}