// app/dashboard/student/profile/edit/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StudentProfile {
  id: string;
  username: string;
  email: string;
  role: 'student';
  bio?: string;
  phone_number?: string;
  show_phone?: boolean;
  // Student-specific fields
  grade_level?: string;
  learning_goals?: string;
}

export default function StudentProfileEditPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user.role === 'student') {
          setProfile(data.user);
        }
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
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
      const response = await fetch('http://localhost:3001/api/students/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: profile.bio,
          phone_number: profile.phone_number,
          show_phone: profile.show_phone,
          grade_level: profile.grade_level,
          learning_goals: profile.learning_goals,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/student/profile');
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Student Profile</h1>
          <p className="text-gray-600 mt-2">Update your personal information and learning preferences</p>
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
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell tutors about your learning goals and interests..."
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
                    Show phone number to tutors
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <select
                  value={profile.grade_level || ''}
                  onChange={(e) => handleChange('grade_level', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade level</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="CSEC">CSEC</option>
                  <option value="CAPE Year 1">CAPE Year 1</option>
                  <option value="CAPE Year 2">CAPE Year 2</option>
                  <option value="University">University</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Learning Goals</label>
                <textarea
                  value={profile.learning_goals || ''}
                  onChange={(e) => handleChange('learning_goals', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What are your learning objectives? (e.g., 'Improve in Algebra', 'Prepare for CSEC exams')"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/dashboard/student/profile')}
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