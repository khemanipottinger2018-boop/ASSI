// frontend/ui/ServiceSelector.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, User, Book, ChevronDown, Search, BookOpen } from 'lucide-react';

// CORRECT Tutor interface based on your actual database schema
interface Tutor {
  tutor_id: string;
  user_id: string;
  hourly_rate: number;
  is_available: boolean;
  bio: string;
  teaching_philosophy?: string;
  preferred_teaching_times?: string;
  timezone?: string;
  profile_completed_at?: Date;
  last_profile_update?: Date;
  is_student_tutor: boolean;
  service_tier?: string;
  // From Users table join
  username: string;
  email: string;
  profile_pic?: string;
  // From Subjects join
  subjects: Array<{
    subject_id: string;
    name: string;
    level: string;
  }>;
  // Calculated fields (optional)
  total_sessions?: number;
  avg_rating?: number;
  review_count?: number;
}

interface Subject {
  subject_id: string;
  name: string;
  level: 'CSEC' | 'CAPE';
}

interface ServiceSelectorProps {
  onThemeChange: (theme: string) => void;
}

export default function ServiceSelector({ onThemeChange }: ServiceSelectorProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch subjects from database
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        setError(null);
        
        console.log('📚 Fetching subjects from backend...');
        const response = await fetch('http://localhost:3001/api/subjects');
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
          const sortedSubjects = result.data.sort((a: Subject, b: Subject) => a.name.localeCompare(b.name));
          setSubjects(sortedSubjects);
          setFilteredSubjects(sortedSubjects);
          console.log(`✅ Loaded ${sortedSubjects.length} subjects from database`);
        } else {
          throw new Error(result.error || 'API returned failure');
        }
        
      } catch (err) {
        console.error('❌ Error fetching subjects:', err);
        setError('Unable to load subjects. Please refresh the page.');
        setSubjects([]);
        setFilteredSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Filter subjects based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSubjects(subjects);
    } else {
      const filtered = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubjects(filtered);
    }
  }, [searchTerm, subjects]);

  // Fetch tutors for selected subject
  useEffect(() => {
    if (!selectedSubject) {
      setTutors([]);
      setError(null);
      return;
    }

    const fetchTutors = async () => {
      setLoadingTutors(true);
      setError(null);
      try {
        console.log(`🔍 Fetching tutors for subject: ${selectedSubject.name} (${selectedSubject.subject_id})`);
        
        const res = await fetch(`http://localhost:3001/api/tutors/public/search?subjectId=${selectedSubject.subject_id}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const result = await res.json();
        
        console.log('📦 Tutor API Response:', result);
        
        if (result.success) {
          const tutorsData = result.data || [];
          setTutors(tutorsData);
          console.log(`✅ Found ${tutorsData.length} tutors for ${selectedSubject.name}`);
        } else {
          throw new Error(result.error || 'No tutors found');
        }
      } catch (err) {
        console.error('❌ Tutor fetch error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tutors';
        setError(errorMsg);
        setTutors([]);
      } finally {
        setLoadingTutors(false);
      }
    };

    fetchTutors();
  }, [selectedSubject]);

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDropdownOpen(false);
    setSearchTerm('');

    // Smart theme detection
    const subjectName = subject.name.toLowerCase();
    let theme = 'caribbean-vibrant';
    
    if (subjectName.includes('math')) theme = 'math';
    else if (subjectName.includes('english') || subjectName.includes('literature')) theme = 'english';
    else if (subjectName.includes('science') || subjectName.includes('biology') || subjectName.includes('chemistry') || subjectName.includes('physics')) theme = 'science';
    else if (subjectName.includes('technology') || subjectName.includes('computer') || subjectName.includes('it')) theme = 'it';
    else if (subjectName.includes('business') || subjectName.includes('account') || subjectName.includes('economic')) theme = 'business';
    else if (subjectName.includes('art') || subjectName.includes('music') || subjectName.includes('theatre') || subjectName.includes('visual')) theme = 'arts';
    else if (subjectName.includes('spanish') || subjectName.includes('french')) theme = 'language';
    
    onThemeChange(theme);
  };

  const handleAIAssistant = () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }
    setError('AI Assistant coming soon! Try Live Tutoring for now.');
  };

  const handleFullAssignment = () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }
    setError('Full Assignment service coming soon! Try Live Tutoring for now.');
  };

  const handleLiveTutors = () => {
    if (!selectedSubject) {
      setError('Please select a subject first');
      return;
    }
    
    if (!tutors.length) {
      setError(`No tutors available for ${selectedSubject.name}. Try a different subject or check back later.`);
      return;
    }
    
    const subjectName = selectedSubject.name.toLowerCase();
    let theme = 'caribbean-vibrant';
    
    if (subjectName.includes('math')) theme = 'math';
    else if (subjectName.includes('english') || subjectName.includes('literature')) theme = 'english';
    else if (subjectName.includes('science') || subjectName.includes('biology') || subjectName.includes('chemistry') || subjectName.includes('physics')) theme = 'science';
    else if (subjectName.includes('technology') || subjectName.includes('computer') || subjectName.includes('it')) theme = 'it';
    
    // Pass subject ID to tutors page
    const params = new URLSearchParams({
      subjectId: selectedSubject.subject_id,
      subjectName: selectedSubject.name,
      theme: theme,
      availableTutors: tutors.length.toString()
    });
    
    console.log(`🎯 Navigating to tutors page with ${tutors.length} tutors`);
    router.push(`/tutors?${params.toString()}`);
  };

  const getLevelColor = (level: string) => {
    return level === 'CAPE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  const getLevelText = (level: string) => {
    return level === 'CAPE' ? 'CAPE' : 'CSEC';
  };

  const groupSubjectsByCategory = (subjects: Subject[]) => {
    const categories: { [key: string]: Subject[] } = {};
    
    subjects.forEach(subject => {
      const firstLetter = subject.name.charAt(0).toUpperCase();
      if (!categories[firstLetter]) {
        categories[firstLetter] = [];
      }
      categories[firstLetter].push(subject);
    });
    
    return categories;
  };

  const categorizedSubjects = groupSubjectsByCategory(filteredSubjects);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl max-w-4xl w-full mx-4"
    >
      <h2 className="text-3xl font-bold text-white text-center mb-2 drop-shadow-lg">
        Well, what are you getting into today?
      </h2>
      <p className="text-white/90 text-center mb-8 text-lg drop-shadow">
        Choose your ASSI-stance level
      </p>

      {/* Professional Subject Selector */}
      <div className="relative" ref={dropdownRef}>
        {/* Selected Subject Display */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300 text-lg font-medium flex items-center justify-between group hover:bg-white/15 hover:border-white/30"
        >
          <div className="flex items-center space-x-3">
            {selectedSubject ? (
              <>
                <div className="p-2 rounded-lg bg-white/10 border border-white/20">
                  <BookOpen size={20} className="text-white/80" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">{selectedSubject.name}</div>
                  <div className={`text-xs px-2 py-1 rounded-full border ${getLevelColor(selectedSubject.level)}`}>
                    {getLevelText(selectedSubject.level)}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <BookOpen size={20} className="text-white/60" />
                <span className="text-white/80">Select your subject...</span>
              </div>
            )}
          </div>
          <motion.div
            animate={{ rotate: isDropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/60 group-hover:text-white transition-colors"
          >
            <ChevronDown size={20} />
          </motion.div>
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden"
            >
              {/* Search Bar */}
              <div className="p-3 border-b border-white/10 bg-white/5">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder={`Search ${subjects.length} subjects...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                  />
                </div>
              </div>

              {/* Subjects List */}
              <div className="max-h-80 overflow-y-auto">
                {loadingSubjects ? (
                  <div className="p-6 text-center text-white/60">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    Loading subjects...
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="p-6 text-center text-white/60">
                    No subjects found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(categorizedSubjects).map(([letter, letterSubjects]) => (
                      <div key={letter} className="mb-2">
                        <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wide bg-white/5 rounded-lg mx-2">
                          {letter}
                        </div>
                        <div className="space-y-1 mt-1">
                          {letterSubjects.map((subject, index) => (
                            <motion.button
                              key={subject.subject_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              onClick={() => handleSubjectSelect(subject)}
                              className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between group mx-2 ${
                                selectedSubject?.subject_id === subject.subject_id
                                  ? 'bg-blue-500/20 border border-blue-400/30 shadow-lg'
                                  : 'hover:bg-white/10 border border-transparent hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-white/10 border border-white/20">
                                  <BookOpen size={16} className="text-white/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-white truncate">{subject.name}</div>
                                </div>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full border ${getLevelColor(subject.level)}`}>
                                {getLevelText(subject.level)}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 bg-white/5">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>{filteredSubjects.length} of {subjects.length} subjects</span>
                  <span>Type to search • Click to select</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Messages */}
      <div className="mt-4 text-center min-h-6">
        {loadingTutors && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-yellow-300 text-sm">
            🔍 Checking tutor availability for {selectedSubject?.name}...
          </motion.p>
        )}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-300 text-sm">
            ⚠️ {error}
          </motion.p>
        )}
        {!loadingTutors && !error && selectedSubject && tutors.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-300 text-sm">
            ✅ {tutors.length} tutor{tutors.length > 1 ? 's' : ''} available for {selectedSubject.name} - Ready to learn!
          </motion.p>
        )}
        {!loadingTutors && !error && selectedSubject && tutors.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-orange-300 text-sm">
            💡 No tutors available for {selectedSubject.name} - Try AI Assistant or another subject
          </motion.p>
        )}
      </div>

      {/* Service Buttons */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {/* AI Assistant */}
        <motion.button
          whileHover={{ scale: selectedSubject ? 1.05 : 1 }}
          whileTap={{ scale: selectedSubject ? 0.95 : 1 }}
          onClick={handleAIAssistant}
          disabled={!selectedSubject}
          className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white p-5 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-teal-400/30 flex items-center justify-center space-x-2 group"
        >
          <Cpu size={20} className="group-hover:scale-110 transition-transform" />
          <span>AI ASS-istant</span>
        </motion.button>

        {/* Live Tutoring */}
        <motion.button
          whileHover={{ scale: selectedSubject && tutors.length ? 1.05 : 1 }}
          whileTap={{ scale: selectedSubject && tutors.length ? 0.95 : 1 }}
          onClick={handleLiveTutors}
          disabled={!selectedSubject || !tutors.length}
          className={`${
            selectedSubject && tutors.length
              ? 'bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 border-orange-400/30' 
              : 'bg-gray-600/70 border-gray-400/20 cursor-not-allowed'
          } text-white p-5 rounded-2xl font-bold transition-all duration-300 shadow-lg border-2 flex items-center justify-center space-x-2 group`}
        >
          <User size={20} className={selectedSubject && tutors.length ? 'group-hover:scale-110 transition-transform' : ''} />
          <span>Live ASSI-stant</span>
        </motion.button>

        {/* Full Assignment */}
        <motion.button
          whileHover={{ scale: selectedSubject ? 1.05 : 1 }}
          whileTap={{ scale: selectedSubject ? 0.95 : 1 }}
          onClick={handleFullAssignment}
          disabled={!selectedSubject}
          className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-5 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-purple-400/30 flex items-center justify-center space-x-2 group"
        >
          <Book size={20} className="group-hover:scale-110 transition-transform" />
          <span>Full ASSI-gnment</span>
        </motion.button>
      </div>

      {/* Success Celebration */}
      {subjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-green-400 text-sm font-semibold">
            🎉 {subjects.length} subjects loaded and ready!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}