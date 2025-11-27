"use client";
import { ReactNode } from 'react';

interface SessionLayoutProps {
  sidebar: ReactNode;
  mainContent: ReactNode;
}

export function SessionLayout({ sidebar, mainContent }: SessionLayoutProps) {
  return (
    <div className="h-screen text-white overflow-hidden relative">
      {/* Background will come from the parent page */}
      
      {/* Tinted glass UI overlay */}
      <div className="relative z-10 h-full flex">
        {/* Sidebar - Tinted glass */}
        <div className="w-80 bg-black/20 backdrop-blur-md border-r border-white/10 flex flex-col hidden md:flex">
          {sidebar}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Top Bar - Tinted glass */}
          <div className="md:hidden h-14 bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
            <h1 className="text-lg font-bold text-white">ASSI Live</h1>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>
          
          {/* Desktop Top Bar - Tinted glass */}
          <div className="hidden md:flex h-16 bg-black/20 backdrop-blur-md border-b border-white/10 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">Live Tutoring</h1>
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Connected</span>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {mainContent}
          </div>
        </div>
      </div>
    </div>
  );
}
