"use client";

import { Users, Grid3X3, List, Sliders } from 'lucide-react';

interface SearchHeaderProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onMobileFiltersOpen: () => void;
  activeFilterCount: number;
}

export default function SearchHeader({ 
  viewMode, 
  onViewModeChange, 
  onMobileFiltersOpen, 
  activeFilterCount 
}: SearchHeaderProps) {
  return (
    <div className="bg-black/40 backdrop-blur-2xl border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Users size={24} />
            <span>Book Tutoring Sessions</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Find and book sessions with expert tutors</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={onMobileFiltersOpen}
            className="xl:hidden bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-blue-300 px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 relative shadow-lg hover:shadow-xl"
          >
            <Sliders size={18} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-xs rounded-full flex items-center justify-center shadow-lg">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
