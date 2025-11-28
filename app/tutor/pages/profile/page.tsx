'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TutorProfile {
  id: string;
  username: string;
  email: string;
  role: 'tutor';
  bio?: string;
  phone_number?: string;
  show_phone?: boolean;
  // Tutor-specific fields
  tutor_id: string;
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
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTutorProfile();
  }, []);

  const fetchTutorProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/signin');
        return;
      }

      // Fetch user basic info
      const userResponse = await fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        
        if (userData.success && userData.user.role === 'tutor') {
          // Fetch detailed tutor profile
          const tutorResponse = await fetch(`http://localhost:3001/api/tutors/${userData.user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (tutorResponse.ok) {
            const tutorData = await tutorResponse.json();
            setProfile({
              ...userData.user,
              ...tutorData.data
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tutor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading tutor profile...</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tutor Profile</h1>
          <button
            onClick={() => router.push('/dashboard/tutor/profile/edit')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Tutor Profile
          </button>
        </div>

        {/* Tutor-specific profile content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {profile.username}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{profile.email}</p>
                </div>
                {profile.bio && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bio</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                  <p className="text-gray-900">${profile.hourly_rate}/hour</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expertise Level</label>
                  <p className="text-gray-900">{profile.expertise_level}</p>
                </div>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-900">{profile.total_sessions}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Response Time</p>
                <p className="text-2xl font-bold text-green-900">{profile.response_time}</p>
              </div>
              <div className={`p-4 rounded-lg ${profile.is_available ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm">Status</p>
                <p className={`text-2xl font-bold ${profile.is_available ? 'text-green-900' : 'text-red-900'}`}>
                  {profile.is_available ? 'Available' : 'Not Available'}
                </p>
              </div>
            </div>
          </div>

          {/* Subjects Section */}
          {profile.subjects && profile.subjects.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {profile.subjects.map((subject) => (
                  <span
                    key={subject.subject_id}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {subject.name} ({subject.level})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Qualifications */}
          {profile.certifications && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
              <p className="text-gray-700">{profile.certifications}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}