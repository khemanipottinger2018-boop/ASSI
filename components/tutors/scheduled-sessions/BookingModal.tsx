"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, BookOpen, MessageCircle, Bookmark } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: Tutor | null;
  subjects: Subject[];
}

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

export default function BookingModal({ isOpen, onClose, tutor, subjects }: BookingModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tutor && tutor.subjects.length > 0) {
      setSelectedSubject(tutor.subjects[0].subject_id);
    }
  }, [tutor]);

  const calculatePrice = () => {
    if (!tutor) return 0;
    return (tutor.hourly_rate * duration) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor || !selectedSubject) return;

    setLoading(true);
    try {
      const bookingData = {
        tutor_id: tutor.tutor_id,
        subject_id: selectedSubject,
        scheduled_time: `${scheduledDate}T${scheduledTime}:00`, // Add seconds for ISO format
        duration_minutes: duration,
        price: calculatePrice(),
        notes: notes
      };

      // USING EXISTING ENTERPRISE API
      const response = await fetch('http://localhost:3001/api/booked-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // For auth cookies
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Session booked successfully!');
          onClose();
          setScheduledDate('');
          setScheduledTime('');
          setDuration(60);
          setNotes('');
        } else {
          alert(result.error || 'Failed to book session');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to book session');
      }
    } catch (error: any) {
      console.error('Error booking session:', error);
      alert(error.message || 'Failed to book session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tutor) return null;

  const price = calculatePrice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Bookmark size={20} />
            <span>Book Session</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {tutor.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-white">{tutor.username}</h3>
              <p className="text-white/60 text-sm">${tutor.hourly_rate}/hour</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
              <BookOpen size={16} />
              <span>Subject</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none cursor-pointer"
              required
            >
              {tutor.subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.name} ({subject.level})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
                <Calendar size={16} />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
                <Clock size={16} />
                <span>Time</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
              <Clock size={16} />
              <span>Duration</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none cursor-pointer"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-white/80">
              <MessageCircle size={16} />
              <span>Notes (Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific topics or requirements..."
              rows={3}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
            />
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex justify-between items-center text-white">
              <span className="text-sm">Total Price:</span>
              <span className="text-lg font-bold">${price.toFixed(2)}</span>
            </div>
            <div className="text-white/60 text-xs mt-1">
              {duration} min × ${tutor.hourly_rate}/hour
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Booking...</span>
              </>
            ) : (
              <>
                <Bookmark size={16} />
                <span>Book Session</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
