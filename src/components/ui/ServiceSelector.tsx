'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tutor {
  id: string;
  name: string;
  email: string;
  rating: number | null;
  hourly_rate: number;
  bio: string;
  expertise_level: string;
  subject_credentials?: string;
  display_rating: string;
  hourly_rate_display: string;
}

export default function ServiceSelector({ onServiceSelect, onThemeChange }: { 
  onServiceSelect: (service: string, tutors?: Tutor[]) => void,
  onThemeChange: (theme: string) => void 
}) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [hasTutors, setHasTutors] = useState(false);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [tutorCount, setTutorCount] = useState(0);
  const router = useRouter();

  const subjects = [
    { name: 'Mathematics', value: 'math', theme: 'math' },
    { name: 'English Language', value: 'english', theme: 'english' },
    { name: 'Integrated Science', value: 'science', theme: 'science' },
    { name: 'Social Studies', value: 'social-studies', theme: 'social-studies' },
    { name: 'Principles of Business', value: 'business', theme: 'business' },
    { name: 'Accounts', value: 'accounts', theme: 'accounts' },
    { name: 'Information Technology', value: 'it', theme: 'it' },
    { name: 'Physics', value: 'physics', theme: 'physics' },
    { name: 'Chemistry', value: 'chemistry', theme: 'chemistry' },
    { name: 'Biology', value: 'biology', theme: 'science' },
    { name: 'Geography', value: 'geography', theme: 'social-studies' },
    { name: 'History', value: 'history', theme: 'social-studies' },
    { name: 'Spanish', value: 'spanish', theme: 'english' },
    { name: 'French', value: 'french', theme: 'english' },
  ];

  // Check tutor availability when subject changes
  useEffect(() => {
    const checkTutorAvailability = async () => {
      if (!selectedSubject) {
        setHasTutors(false);
        setTutorCount(0);
        return;
      }

      setLoadingTutors(true);
      try {
        console.log('🔍 Checking tutor availability for:', selectedSubject);
        const response = await fetch(`/api/tutors/availability?subject=${encodeURIComponent(selectedSubject)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setHasTutors(data.hasTutors);
          setTutorCount(data.availableTutors || 0);
          console.log('📊 Found tutors:', data.availableTutors);
        } else {
          console.warn('API returned failure:', data.error);
          setHasTutors(false);
          setTutorCount(0);
        }
      } catch (error) {
        console.error('❌ Failed to check tutor availability:', error);
        setHasTutors(false);
        setTutorCount(0);
      } finally {
        setLoadingTutors(false);
      }
    };

    checkTutorAvailability();
  }, [selectedSubject]);

  const handleSubjectChange = (subjectValue: string) => {
    setSelectedSubject(subjectValue);
    const subject = subjects.find(s => s.value === subjectValue);
    if (subject && onThemeChange) {
      onThemeChange(subject.theme);
    }
  };

  const handleTutorRequest = () => {
    if (!hasTutors || !selectedSubject) return;
    
    // Navigate to tutor selection page
    router.push(`/tutors?subject=${encodeURIComponent(selectedSubject)}`);
  };

  const handleAIAssistant = () => {
    console.log('🤖 AI Assistant selected for:', selectedSubject);
    onServiceSelect('ai');
  };

  const handleFullAssignment = () => {
    console.log('📝 Full Assignment selected for:', selectedSubject);
    onServiceSelect('full');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 border border-white/30 shadow-2xl max-w-2xl w-full"
    >
      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white text-center mb-2 drop-shadow-lg"
      >
        Well, what are you getting into today?
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/90 text-center mb-8 text-lg drop-shadow"
      >
        Choose your ASSI-stance level
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-6"
      >
        <select 
          value={selectedSubject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full p-4 rounded-xl bg-white/25 backdrop-blur-sm text-white border-2 border-white/40 focus:outline-none focus:ring-4 focus:ring-white/30 focus:border-white/60 transition-all duration-300 text-lg font-medium"
        >
          <option value="" className="text-gray-700">Select your subject...</option>
          {subjects.map(subject => (
            <option key={subject.value} value={subject.value} className="text-gray-900">
              {subject.name}
            </option>
          ))}
        </select>

        {/* Simple Tutor Count Display */}
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-center"
          >
            {loadingTutors ? (
              <p className="text-yellow-300 text-sm">🔍 Checking tutor availability...</p>
            ) : hasTutors ? (
              <p className="text-green-300 text-sm font-semibold">
                ✅ {tutorCount} tutor{tutorCount !== 1 ? 's' : ''} available for {selectedSubject}
              </p>
            ) : (
              <p className="text-orange-300 text-sm">📚 No live tutors available - try AI Assistant</p>
            )}
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {/* AI Assistant - Always available */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAIAssistant}
            disabled={!selectedSubject}
            className="bg-teal-600/90 hover:bg-teal-500 text-white p-5 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-teal-400/30"
          >
            <div className="text-2xl mb-2">🤖</div>
            AI ASS-istant<br/>
            <span className="text-sm font-normal">Free • Instant</span>
          </motion.button>

          {/* Live Tutor - Only available if tutors exist */}
          <motion.button
            whileHover={hasTutors ? { scale: 1.05, y: -2 } : {}}
            whileTap={hasTutors ? { scale: 0.95 } : {}}
            onClick={handleTutorRequest}
            disabled={!selectedSubject || !hasTutors || loadingTutors}
            className={`${
              hasTutors 
                ? 'bg-orange-600/90 hover:bg-orange-500' 
                : 'bg-gray-600/70 cursor-not-allowed'
            } text-white p-5 rounded-2xl font-bold disabled:opacity-50 transition-all duration-300 shadow-lg border-2 ${
              hasTutors ? 'border-orange-400/30 hover:border-orange-300/50' : 'border-gray-400/20'
            }`}
          >
            <div className="text-2xl mb-2">
              {loadingTutors ? '⏳' : hasTutors ? '👨‍🏫' : '⏸️'}
            </div>
            Live ASSI-stant<br/>
            <span className="text-sm font-normal">
              {loadingTutors ? 'Checking...' : hasTutors ? `${tutorCount} Available` : 'No Tutors'}
            </span>
          </motion.button>

          {/* Full Assignment - Always available */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFullAssignment}
            disabled={!selectedSubject}
            className="bg-purple-600/90 hover:bg-purple-500 text-white p-5 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-purple-400/30"
          >
            <div className="text-2xl mb-2">📝</div>
            Full ASSI-gnment<br/>
            <span className="text-sm font-normal">We Do It For You</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}