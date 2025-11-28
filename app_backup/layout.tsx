import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import Navbar from "../frontend/components/Navbar";
import { RootProvider } from "../contexts/RootProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASSI - Academic Support & Study Initiative",
  description: "Connect with expert tutors and get personalized academic support. Jamaica's premier tutoring platform.",
  keywords: ["tutoring", "education", "learning", "academic support", "Jamaica", "CSEC", "CAPE"],
  authors: [{ name: "ASSI Team" }],
  openGraph: {
    title: "ASSI - Academic Support & Study Initiative",
    description: "Connect with expert tutors and get personalized academic support",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gray-50`}
      >
        <RootProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>

            {/* Production Footer */}
            <footer className="bg-white border-t mt-auto">
              <div className="max-w-7xl mx-auto py-6 px-4">
                <div className="text-center text-gray-500 text-sm">
                  <p>© {new Date().getFullYear()} ASSI Platform. Empowering education across Jamaica.</p>
                </div>
              </div>
            </footer>
          </div>
        </RootProvider>
      </body>
    </html>
  );
}
