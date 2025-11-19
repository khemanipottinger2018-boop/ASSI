'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LavalampBackground from '@/components/ui/LavalampBackground';
import FloatingShapes from '@/components/ui/FloatingShapes';

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

export default function TutorListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subject = searchParams.get('subject');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) {
      router.push('/');
      return;
    }

    const fetchTutors = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tutors/availability?subject=${encodeURIComponent(subject)}`);
        
        if (!response.ok) throw new Error('Failed to fetch tutors');
        
        const data = await response.json();
        if (data.success) {
          setTutors(data.tutors || []);
        }
      } catch (error) {
        console.error('Error fetching tutors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, [subject, router]);

  const handleSelectTutor = (tutorId: string) => {
    setSelectedTutor(tutorId);
    // Start chat session
    router.push(`/chat/${tutorId}?subject=${encodeURIComponent(subject || '')}`);
  };

  const getExpertiseColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'expert': return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'advanced': return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      default: return 'bg-green-500/20 text-green-300 border-green-400/30';
    }
  };

  if (!subject) {
    return null;
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      <LavalampBackground theme="tutor-list" />
      <FloatingShapes theme="tutor-list" />
      
      <div className="relative z-10 min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-white mb-4"
            >
              Available Tutors for <span className="text-orange-400 capitalize">{subject}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 text-lg"
            >
              Choose your tutor and start learning
            </motion.p>
          </div>

          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => router.back()}
            className="mb-6 px-6 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300"
          >
            ← Back to Subjects
          </motion.button>

          {/* Tutors Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-white text-xl">Loading tutors...</div>
            </div>
          ) : tutors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white text-xl mb-4">No tutors available for {subject}</div>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300"
              >
                Choose Another Subject
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {tutors.map((tutor, index) => (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="bg-white/15 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
                >
                  {/* Tutor Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{tutor.name}</h3>
                      <p className="text-yellow-300 font-semibold">{tutor.display_rating}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getExpertiseColor(tutor.expertise_level)}`}>
                      {tutor.expertise_level}
                    </span>
                  </div>

                  {/* Credentials */}
                  {tutor.subject_credentials && (
                    <p className="text-blue-300 text-sm mb-3">{tutor.subject_credentials}</p>
                  )}

                  {/* Bio */}
                  <p className="text-gray-200 text-sm mb-4 line-clamp-3">{tutor.bio}</p>

                  {/* Rate and Action */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-300 font-bold text-lg">{tutor.hourly_rate_display}</p>
                      <p className="text-gray-400 text-sm">per hour</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectTutor(tutor.id)}
                      disabled={selectedTutor === tutor.id}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {selectedTutor === tutor.id ? 'Starting...' : 'Select Tutor'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
