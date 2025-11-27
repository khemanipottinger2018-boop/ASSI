"use client";
import { useState, useEffect } from 'react';
import { Tutor } from '../types/tutor.types';
import { SessionLayout } from '../common/SessionLayout';  // Named export
import SessionSidebar from '../common/SessionSidebar';    // Default export
import { ChatRequestModal } from './ChatRequestModal';
import { NoTutorsAvailable } from '../common/NoTutorsAvailable';
import TutorCard from '../common/TutorCard';              // Default export

interface TutorLiveChatClientProps {
  subjectId?: string;
  subjectName?: string;
  theme: string;
  availableTutors: number;
  initialTutors: Tutor[];
}

export default function TutorLiveChatClient({
  subjectId,
  subjectName,
  theme,
  availableTutors,
  initialTutors
}: TutorLiveChatClientProps) {
  const [tutors, setTutors] = useState<Tutor[]>(initialTutors);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refresh tutors periodically or when subject changes
  useEffect(() => {
    const refreshTutors = async () => {
      if (!subjectId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/tutors/public/search?subjectId=${subjectId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setTutors(result.data || []);
          }
        }
      } catch (error) {
        console.error('Error refreshing tutors:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshTutors();
    const interval = setInterval(refreshTutors, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [subjectId]);

  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowRequestModal(true);
  };

  const handleRequestConfirm = async (notes: string, urgency: string) => {
    if (!selectedTutor) return;

    try {
      // Send chat request to backend
      const response = await fetch('http://localhost:3001/api/chat/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutor_id: selectedTutor.tutor_id,
          subject_id: subjectId,
          notes,
          urgency
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setShowRequestModal(false);
          setSelectedTutor(null);
          alert('Chat request sent successfully!');
        }
      }
    } catch (error) {
      console.error('Error sending chat request:', error);
      alert('Failed to send chat request');
    }
  };

  const sidebar = (
    <SessionSidebar 
      subjectName={subjectName} 
      availableTutors={availableTutors}
      totalTutors={tutors.length}
      onlineTutors={tutors.filter(t => t.is_available).length}
    />
  );

  const mainContent = (
    <div className="flex-1 p-6 overflow-auto">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Refreshing tutors...</div>
        </div>
      ) : tutors.length === 0 ? (
        <NoTutorsAvailable />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor) => (
            <TutorCard
              key={tutor.tutor_id}
              tutor={tutor}
              viewMode="grid"
              onBookSession={handleTutorSelect}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <SessionLayout sidebar={sidebar} mainContent={mainContent} theme={theme}>
      <ChatRequestModal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedTutor(null);
        }}
        onConfirm={handleRequestConfirm}
        tutor={selectedTutor}
        subjectName={subjectName}
      />
    </SessionLayout>
  );
}
