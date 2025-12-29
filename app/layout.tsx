import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles/globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Navbar from "../frontend/components/Navbar";
import AnimatedGradient from "../frontend/ui/themes/AnimatedGradient";
import FloatingShapes from "../frontend/ui/themes/FloatingBlobs";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ASSI.app - Instant Homework Help | AI + Live Tutors",
  description: "Caribbean students: Get instant help from AI or human tutors. CXC/CAPE exam prep, live chat, assignment help. Your study sidekick!",
  keywords: ["tutoring Jamaica", "CXC help", "CAPE tutors", "homework help", "live tutoring", "AI study assistant", "Caribbean education"],
  authors: [{ name: "ASSI Team" }],
  openGraph: {
    title: "ASSI - Your Instant Study Sidekick",
    description: "AI + Human tutors for Caribbean students. Get help NOW.",
    type: "website",
    url: "https://assi.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASSI.app - Study Help That Doesn't Sleep",
    description: "2 AM panic? We're awake. Get instant help!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen relative`}>
        {/* ================= BACKGROUNDS ================= */}
        <AnimatedGradient />
        <FloatingShapes />

        {/* ================= CONTENT ================= */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <AuthProvider>
              {/* Navbar */}
              <Navbar />

              {/* Main content */}
              <main className="flex-1">{children}</main>

              {/* Footer */}
              <footer className="bg-white/10 backdrop-blur-md border-t border-white/20 mt-auto">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="h-10 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="font-bold text-white">ASSI</div>
                      <div className="text-gray-400">•</div>
                      <span className="text-gray-300">Your study sidekick</span>
                    </div>
                    <div className="text-gray-400">
                      © {new Date().getFullYear()} ASSI.app
                    </div>
                    <div className="flex items-center space-x-3 text-gray-400">
                      <a href="/about" className="hover:text-white transition-colors">About</a>
                      <a href="/contact" className="hover:text-white transition-colors">Contact</a>
                      <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                    </div>
                  </div>
                </div>
              </footer>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
