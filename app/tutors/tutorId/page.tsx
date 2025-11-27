// app/tutors/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, Clock, Award, BookOpen, Users, Calendar, MessageCircle } from 'lucide-react';

interface Tutor {
  id: string;
  tutor_id: string;
  user_id: string;
  username: string;
  email: string;
  bio: string;
  expertise_level: string;
  hourly_rate: number;
  total_sessions: number;
  is_available: boolean;
  response_time: string;
  jamaican_curriculum: boolean;
  education_background: string;
  certifications: string;
  subjects: Array<{
    subject_id: string;
    name: string;
    level: string;
  }>;
}

export default function TutorProfilePage() {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const tutorId = params.id as string;

  useEffect(() => {
    fetchTutorProfile();
  }, [tutorId]);

  const fetchTutorProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tutors/${tutorId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTutor(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching tutor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const bookSession = () => {
    router.push(`/booking/${tutorId}`);
  };

  if (loading) {
    return <div>Loading tutor profile...</div>;
  }

  if (!tutor) {
    return <div>Tutor not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {tutor.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{tutor.username}</h1>
                  {tutor.jamaican_curriculum && (
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      <Award size={14} />
                      <span>Jamaican Curriculum</span>
                    </div>
                  )}
                </div>
                <p className="text-xl text-gray-600 mb-3">{tutor.expertise_level} Tutor</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Star size={16} className="text-yellow-400 fill-current" />
                    <span className="font-medium text-gray-700">4.8</span>
                    <span>({tutor.total_sessions} sessions)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span>{tutor.response_time} response time</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${tutor.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${tutor.is_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{tutor.is_available ? 'Available' : 'Not Available'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600">${tutor.hourly_rate}</div>
              <div className="text-gray-500">per hour</div>
              <button
                onClick={bookSession}
                disabled={!tutor.is_available}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Book Session
              </button>
            </div>
          </div>

          {/* Bio */}
          {tutor.bio && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About Me</h2>
              <p className="text-gray-700 leading-relaxed">{tutor.bio}</p>
            </div>
          )}

          {/* Subjects */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Subjects</h2>
            <div className="flex flex-wrap gap-2">
              {tutor.subjects.map((subject) => (
                <span
                  key={subject.subject_id}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium"
                >
                  {subject.name} ({subject.level})
                </span>
              ))}
            </div>
          </div>

          {/* Education & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutor.education_background && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Education</h3>
                <p className="text-gray-700">{tutor.education_background}</p>
              </div>
            )}
            {tutor.certifications && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Certifications</h3>
                <p className="text-gray-700">{tutor.certifications}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats & Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <Users size={32} className="mx-auto text-blue-600 mb-3" />
            <div className="text-2xl font-bold text-gray-900">{tutor.total_sessions}+</div>
            <div className="text-gray-600">Sessions Completed</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <Star size={32} className="mx-auto text-yellow-500 mb-3" />
            <div className="text-2xl font-bold text-gray-900">4.8/5</div>
            <div className="text-gray-600">Student Rating</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
            <Calendar size={32} className="mx-auto text-green-600 mb-3" />
            <div className="text-2xl font-bold text-gray-900">98%</div>
            <div className="text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}