"use client";

import { Search, BookOpen, Target, DollarSign, Sliders, X, Sparkles, GraduationCap, Star, Crown } from 'lucide-react';

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

interface FiltersSidebarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedSubject: string;
  onSubjectChange: (subjectId: string) => void;
  subjects: Subject[];
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  tutorLevel: string;
  onTutorLevelChange: (level: string) => void;
  showOnlineOnly: boolean;
  onShowOnlineOnlyChange: (show: boolean) => void;
  filteredTutorsCount: number;
  activeFilterCount: number;
  onClearFilters: () => void;
}

export default function FiltersSidebar({
  searchTerm,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  subjects,
  priceRange,
  onPriceRangeChange,
  tutorLevel,
  onTutorLevelChange,
  showOnlineOnly,
  onShowOnlineOnlyChange,
  filteredTutorsCount,
  activeFilterCount,
  onClearFilters
}: FiltersSidebarProps) {
  return (
    <div className="h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mb-1">
            <Sliders size={20} />
            <span>Filters</span>
          </h2>
          <p className="text-white/60 text-sm">Refine your results</p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-white/60 hover:text-white transition-colors flex items-center space-x-1 bg-white/10 px-2 py-1 rounded-lg"
          >
            <X size={14} />
            <span>Clear ({activeFilterCount})</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
          <Search size={16} />
          <span>Search Tutors</span>
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Name, subjects, keywords..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
          <BookOpen size={16} />
          <span>Subject</span>
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none cursor-pointer"
        >
          <option value="all">All Subjects</option>
          {subjects.map((subject) => (
            <option key={subject.subject_id} value={subject.subject_id}>
              {subject.name} ({subject.level})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
          <Target size={16} />
          <span>Tutor Level</span>
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'all', label: 'All Levels', icon: <Sparkles size={14} />, color: 'from-gray-400 to-gray-600' },
            { value: 'student', label: 'Student Tutors', icon: <GraduationCap size={14} />, color: 'from-green-400 to-green-600' },
            { value: 'professional', label: 'Professional', icon: <Star size={14} />, color: 'from-blue-400 to-blue-600' },
            { value: 'expert', label: 'Expert Tutors', icon: <Crown size={14} />, color: 'from-purple-400 to-purple-600' }
          ].map((level) => (
            <button
              key={level.value}
              onClick={() => onTutorLevelChange(level.value)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center space-x-3 group ${
                tutorLevel === level.value
                  ? `bg-gradient-to-r ${level.color} border-white/30 text-white shadow-lg`
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-white">
                {level.icon}
              </div>
              <span className="text-sm font-medium">{level.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
          <DollarSign size={16} />
          <span>Hourly Rate</span>
        </label>
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-white/60">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={priceRange[0]}
              onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
              className="absolute w-full appearance-none h-2 bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={priceRange[1]}
              onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
              className="absolute w-full appearance-none h-2 bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
        <label className="flex items-center space-x-3 cursor-pointer flex-1">
          <div className="relative">
            <input
              type="checkbox"
              id="online-only"
              checked={showOnlineOnly}
              onChange={(e) => onShowOnlineOnlyChange(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${
              showOnlineOnly ? 'bg-green-500' : 'bg-white/20'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                showOnlineOnly ? 'transform translate-x-5' : 'transform translate-x-1'
              }`} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${showOnlineOnly ? 'bg-green-400' : 'bg-white/40'}`} />
            <span className="text-white/80 text-sm font-medium">Online Only</span>
          </div>
        </label>
      </div>

      <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 shadow-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">{filteredTutorsCount}</div>
          <div className="text-white/60 text-sm">Tutors Match Your Criteria</div>
          <div className="text-white/40 text-xs mt-2">
            {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'No filters applied'}
          </div>
        </div>
      </div>
    </div>
  );
}
