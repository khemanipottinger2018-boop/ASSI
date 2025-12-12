'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TutorsHeader from '../../components/browse/TutorsHeader';
import TutorsGrid from '../../components/browse/TutorsGrid';
import InstantChatModal from '../../components/browse/InstantChatModal';
import BookSessionModal from '../../components/browse/BookSessionModal';
import { AlertCircle } from 'lucide-react';

interface Tutor {
  id: string;
  userId: string;
  name: string;
  hourlyRate: number;
  isAvailable: boolean;
  status: 'online' | 'idle' | 'busy' | 'offline';
  bio?: string;
  teachingPhilosophy?: string;
}

type ModalType = 'instant-chat' | 'book-session' | null;

export default function TutorsBrowsePage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [message, setMessage] = useState<string>('');
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const subjectId = searchParams.get('subjectId');
  const subjectName = searchParams.get('subjectName');
  const theme = searchParams.get('theme') || 'caribbean-vibrant';

  useEffect(() => {
    if (subjectId) {
      fetchTutors();
    }
  }, [subjectId]);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const response = await fetch(
        `http://localhost:3001/api/tutors?subjectId=${subjectId}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        setMessage('Unable to load tutors. Please refresh.');
        setTutors([]);
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTutors(result.tutors || []);
        if (!result.tutors || result.tutors.length === 0) {
          setMessage(`No tutors found for ${subjectName || 'this subject'}`);
        }
      } else {
        setMessage('Something went wrong. Please refresh.');
        setTutors([]);
      }
    } catch {
      setMessage('Network error. Check your connection.');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantChat = (tutor: Tutor) => {
    if (tutor.status !== 'online' || !tutor.isAvailable) {
      setMessage('Tutor is not available for instant chat.');
      return;
    }
    setSelectedTutor(tutor);
    setActiveModal('instant-chat');
  };

  const handleBookSession = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setActiveModal('book-session');
  };

  const handleViewDetails = (tutor: Tutor) => {
    console.log('View details:', tutor.name);
  };

  const startInstantChat = async (tutorId: string, subjectId: string) => {
    try {
      setMessage('');
      const socket = (window as any).socket;
      
      if (socket) {
        socket.emit('chat:request', {
          tutorId: tutorId,
          subjectId: subjectId,
        }, (response: any) => {
          if (response.success) {
            router.push(`/chat/${response.sessionId}`);
          } else {
            setMessage('Unable to start chat. Try again.');
            setActiveModal(null);
          }
        });
      }
    } catch {
      setMessage('Something went wrong. Try again.');
      setActiveModal(null);
    }
  };

  const handleBookSessionSubmit = async (data: any) => {
    try {
      setMessage('');
      const response = await fetch('http://localhost:3001/api/booked-sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage('✅ Session booked successfully!');
        setTimeout(() => setMessage(''), 3000);
        setActiveModal(null);
        setSelectedTutor(null);
      } else {
        setMessage('Failed to book session. Try again.');
      }
    } catch {
      setMessage('Network error. Try again.');
    }
  };

  if (!subjectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-400" />
          <h1 className="text-2xl font-bold mb-4">No Subject Selected</h1>
          <p className="mb-6">Please select a subject from the homepage.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold hover:opacity-90"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <TutorsHeader 
        subjectName={subjectName || 'Unknown Subject'}
        theme={theme}
        tutorCount={tutors.length}
        loading={loading}
        onRefresh={fetchTutors}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.includes('✅') 
              ? 'bg-green-900/30 border-green-700 text-green-200' 
              : 'bg-orange-900/30 border-orange-700 text-orange-200'
          } border`}>
            <div className="flex items-center">
              <span>{message}</span>
            </div>
          </div>
        )}
        
        <TutorsGrid
          tutors={tutors}
          loading={loading}
          message={message}
          onInstantChat={handleInstantChat}
          onBookSession={handleBookSession}
          onViewDetails={handleViewDetails}
        />
      </div>

      {selectedTutor && activeModal === 'instant-chat' && (
        <InstantChatModal
          tutor={selectedTutor}
          currentSubjectId={subjectId || ''}
          isOpen={true}
          onClose={() => {
            setSelectedTutor(null);
            setActiveModal(null);
          }}
          onSubjectSelect={startInstantChat}
        />
      )}

      {selectedTutor && activeModal === 'book-session' && (
        <BookSessionModal
          tutor={selectedTutor}
          currentSubjectId={subjectId || ''}
          currentSubjectName={subjectName || ''}
          isOpen={true}
          onClose={() => {
            setSelectedTutor(null);
            setActiveModal(null);
          }}
          onSubmit={handleBookSessionSubmit}
        />
      )}
    </div>
  );
}