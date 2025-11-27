// app/booking/[tutorId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, DollarSign, User, BookOpen, ArrowLeft, CheckCircle } from 'lucide-react';

interface Tutor {
  id: string;
  tutor_id: string;
  username: string;
  hourly_rate: number;
  subjects: Array<{
    subject_id: string;
    name: string;
    level: string;
  }>;
}

export default function BookingPage() {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const params = useParams();
  const router = useRouter();
  const tutorId = params.tutorId as string;

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
          if (result.data.subjects.length > 0) {
            setSelectedSubject(result.data.subjects[0].subject_id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tutor:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!tutor) return 0;
    return (tutor.hourly_rate * duration) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor || !selectedSubject || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const scheduledTime = new Date(`${selectedDate}T${selectedTime}`);
      
      const response = await fetch('http://localhost:3001/api/sessions/book', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutor_id: tutorId,
          subject_id: selectedSubject,
          scheduled_time: scheduledTime.toISOString(),
          duration_minutes: duration,
          topic: topic,
          price: calculatePrice(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/dashboard/student/sessions?booked=true`);
      } else {
        alert('Failed to book session');
      }
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Error booking session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 p-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tutor Not Found</h1>
            <p className="text-gray-600 mb-8">The tutor you're looking for is not available.</p>
            <button 
              onClick={() => router.push('/tutors/browse')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold"
            >
              Browse Tutors
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Tutors
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg shadow-green-500/25 mb-4">
              <Calendar className="text-white" size={28} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-green-700 bg-clip-text text-transparent mb-3">
              Book Your Session
            </h1>
            <p className="text-xl text-gray-600">
              Schedule your tutoring session with {tutor.username}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tutor Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/60">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {tutor.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">{tutor.username}</h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <DollarSign size={18} className="text-green-600" />
                      <span className="font-semibold text-green-600">${tutor.hourly_rate}/hour</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="text-sm text-gray-600">
                      Available for sessions
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                <BookOpen size={22} className="text-blue-600" />
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
                className="w-full border border-gray-300/60 rounded-2xl px-4 py-4 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-lg shadow-sm transition-all duration-200"
              >
                <option value="">Choose a subject...</option>
                {tutor.subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.name} ({subject.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Calendar size={22} className="text-blue-600" />
                  Session Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300/60 rounded-2xl px-4 py-4 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-lg shadow-sm transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                  <Clock size={22} className="text-blue-600" />
                  Session Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                  className="w-full border border-gray-300/60 rounded-2xl px-4 py-4 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4 flex items-center gap-3">
                <Clock size={22} className="text-blue-600" />
                Session Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full border border-gray-300/60 rounded-2xl px-4 py-4 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-lg shadow-sm transition-all duration-200"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                What would you like to focus on?
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Newton's Laws of Motion, Algebra review, CAPE Physics Unit 1 exam preparation, CSEC Mathematics past papers..."
                rows={4}
                className="w-full border border-gray-300/60 rounded-2xl px-4 py-4 focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-lg shadow-sm transition-all duration-200 resize-none"
              />
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-gray-700">Session Total:</span>
                <span className="text-3xl font-bold text-green-600">${calculatePrice().toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600">
                {duration} minutes × ${tutor.hourly_rate}/hour
              </p>
              <div className="flex items-center gap-2 mt-4 text-green-600">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">No hidden fees</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedSubject || !selectedDate || !selectedTime}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-2xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-bold text-lg shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Booking Session...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={22} />
                  Confirm Booking
                </div>
              )}
            </button>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-200/60">
              <p className="text-sm text-gray-600">
                You'll be able to review and manage your sessions in your dashboard
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}