"use client";

import { useState, useEffect } from 'react';
import { THEME_COLORS } from '../Constants/themes';
import BookingModal from '../../../components/tutors/scheduled-sessions/BookingModal';
import SearchHeader from '../../../components/tutors/scheduled-sessions/SearchHeader';
import DiscoverySidebar from '../../../components/tutors/scheduled-sessions/DiscoverySidebar';
import FiltersSidebar from '../../../components/tutors/scheduled-sessions/FiltersSidebar';
import TutorCard from '../../../components/tutors/scheduled-sessions/TutorCard';
import { BookText, X, Users, Grid3X3, List, Sliders, Map, BookOpen, Star, GraduationCap, Crown, Bookmark } from 'lucide-react';

// Import LavalampBackground from the correct location
import LavalampBackground from '../../../frontend/ui/LavalampBackground';

interface Tutor {
  tutor_id: string;
  user_id: string;
  hourly_rate: number;
  is_available: boolean;
  bio: string;
  teaching_philosophy?: string;
  preferred_teaching_times?: string;
  timezone?: string;
  is_student_tutor: boolean;
  service_tier?: string;
  username: string;
  email: string;
  subjects: Array<{
    subject_id: string;
    name: string;
    level: string;
  }>;
}

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

const RANDOM_THEMES = ['math', 'english', 'science', 'it', 'business', 'arts', 'language'];

export default function BrowseTutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [tutorLevel, setTutorLevel] = useState<string>('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [randomTheme, setRandomTheme] = useState('caribbean-vibrant');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * RANDOM_THEMES.length);
    setRandomTheme(RANDOM_THEMES[randomIndex]);
    fetchTutors();
    fetchSubjects();
  }, []);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/tutors/public');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTutors(result.data || []);
          setFilteredTutors(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/subjects');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSubjects(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  useEffect(() => {
    let filtered = tutors;

    if (searchTerm) {
      filtered = filtered.filter(tutor =>
        tutor.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tutor.subjects.some(subject => 
          subject.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(tutor =>
        tutor.subjects.some(subject => subject.subject_id === selectedSubject)
      );
    }

    filtered = filtered.filter(tutor =>
      tutor.hourly_rate >= priceRange[0] && tutor.hourly_rate <= priceRange[1]
    );

    if (showOnlineOnly) {
      filtered = filtered.filter(tutor => tutor.is_available);
    }

    if (tutorLevel !== 'all') {
      if (tutorLevel === 'student') {
        filtered = filtered.filter(tutor => tutor.is_student_tutor);
      } else if (tutorLevel === 'professional') {
        filtered = filtered.filter(tutor => !tutor.is_student_tutor && tutor.service_tier !== 'premium');
      } else if (tutorLevel === 'expert') {
        filtered = filtered.filter(tutor => tutor.service_tier === 'premium');
      }
    }

    setFilteredTutors(filtered);
  }, [tutors, searchTerm, selectedSubject, priceRange, showOnlineOnly, tutorLevel]);

  const handleBookSession = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setBookingModalOpen(true);
  };

  const getExpertiseLevel = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return 'Student Tutor';
    if (tutor.service_tier === 'premium') return 'Expert Tutor';
    return 'Professional Tutor';
  };

  const getLevelColor = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return 'from-green-400 to-green-600';
    if (tutor.service_tier === 'premium') return 'from-purple-400 to-purple-600';
    return 'from-blue-400 to-blue-600';
  };

  const getLevelIcon = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return <GraduationCap size={16} />;
    if (tutor.service_tier === 'premium') return <Crown size={16} />;
    return <Star size={16} />;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSubject('all');
    setPriceRange([0, 100]);
    setShowOnlineOnly(false);
    setTutorLevel('all');
  };

  const activeFilterCount = [
    searchTerm,
    selectedSubject !== 'all',
    priceRange[0] > 0 || priceRange[1] < 100,
    showOnlineOnly,
    tutorLevel !== 'all'
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LavalampBackground theme={randomTheme} />
        <div className="relative z-10 text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading tutors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white overflow-hidden relative">
      <LavalampBackground theme={randomTheme} />
      
      <div className="relative z-10 min-h-screen flex">
        {/* Left Sidebar - Discovery */}
        <div className="w-80 bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 hidden xl:block overflow-y-auto">
          <DiscoverySidebar
            tutors={tutors}
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSubjectSelect={setSelectedSubject}
            showOnlineOnly={showOnlineOnly}
            onShowOnlineOnly={setShowOnlineOnly}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SearchHeader
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
            activeFilterCount={activeFilterCount}
          />

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div className="xl:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-80 bg-black/40 backdrop-blur-2xl border-l border-white/10 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Filters</h2>
                  <button 
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
                <FiltersSidebar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedSubject={selectedSubject}
                  onSubjectChange={setSelectedSubject}
                  subjects={subjects}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                  tutorLevel={tutorLevel}
                  onTutorLevelChange={setTutorLevel}
                  showOnlineOnly={showOnlineOnly}
                  onShowOnlineOnlyChange={setShowOnlineOnly}
                  filteredTutorsCount={filteredTutors.length}
                  activeFilterCount={activeFilterCount}
                  onClearFilters={clearFilters}
                />
              </div>
            </div>
          )}

          {/* Tutors Grid */}
          <div className="flex-1 overflow-auto p-6">
            {filteredTutors.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BookText size={48} className="text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Tutors Found</h3>
                  <p className="text-white/60 mb-4">Try adjusting your search criteria</p>
                  <button
                    onClick={clearFilters}
                    className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-blue-300 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className={`gap-6 ${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3' 
                  : 'space-y-4'
              }`}>
                {filteredTutors.map((tutor) => (
                  <TutorCard
                    key={tutor.tutor_id}
                    tutor={tutor}
                    viewMode={viewMode}
                    onBookSession={handleBookSession}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Filters */}
        <div className="w-80 bg-black/30 backdrop-blur-2xl border-l border-white/10 p-6 hidden xl:block overflow-y-auto">
          <FiltersSidebar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            subjects={subjects}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            tutorLevel={tutorLevel}
            onTutorLevelChange={setTutorLevel}
            showOnlineOnly={showOnlineOnly}
            onShowOnlineOnlyChange={setShowOnlineOnly}
            filteredTutorsCount={filteredTutors.length}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
          />
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setSelectedTutor(null);
        }}
        tutor={selectedTutor}
        subjects={subjects}
      />
    </div>
  );
}
