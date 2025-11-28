// app/dashboard/tutor/profile/edit/page.tsx
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

export default function TutorProfileEditPage() {
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

      const userResponse = await fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.user.role === 'tutor') {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/tutors/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: profile.bio,
          phone_number: profile.phone_number,
          show_phone: profile.show_phone,
          expertise_level: profile.expertise_level,
          hourly_rate: profile.hourly_rate,
          is_available: profile.is_available,
          response_time: profile.response_time,
          jamaican_curriculum: profile.jamaican_curriculum,
          education_background: profile.education_background,
          certifications: profile.certifications,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/tutor/profile');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Tutor Profile</h1>
          <p className="text-gray-600 mt-2">Update your tutoring information and preferences</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell students about your teaching style and experience..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone_number || ''}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your phone number"
                />
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="show_phone"
                    checked={profile.show_phone || false}
                    onChange={(e) => handleChange('show_phone', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="show_phone" className="ml-2 text-sm text-gray-600">
                    Show phone number to students
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tutoring Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tutoring Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={profile.hourly_rate || ''}
                  onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25.00"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expertise Level</label>
                <select
                  value={profile.expertise_level || ''}
                  onChange={(e) => handleChange('expertise_level', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Time</label>
                <select
                  value={profile.response_time || ''}
                  onChange={(e) => handleChange('response_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="< 10 min">Within 10 minutes</option>
                  <option value="< 30 min">Within 30 minutes</option>
                  <option value="< 2 hours">Within 2 hours</option>
                  <option value="< 24 hours">Within 24 hours</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={profile.is_available}
                  onChange={(e) => handleChange('is_available', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                  Available for new students
                </label>
              </div>
            </div>
          </div>

          {/* Education & Certifications */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Education & Certifications</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education Background</label>
                <textarea
                  value={profile.education_background || ''}
                  onChange={(e) => handleChange('education_background', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your educational qualifications and background..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                <textarea
                  value={profile.certifications || ''}
                  onChange={(e) => handleChange('certifications', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List your teaching certifications and qualifications..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="jamaican_curriculum"
                  checked={profile.jamaican_curriculum || false}
                  onChange={(e) => handleChange('jamaican_curriculum', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="jamaican_curriculum" className="ml-2 text-sm text-gray-700">
                  Specialize in Jamaican Curriculum (CSEC/CAPE)
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/dashboard/tutor/profile')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}