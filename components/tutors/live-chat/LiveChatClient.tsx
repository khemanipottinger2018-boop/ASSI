"use client";
import { useState, useEffect } from 'react';
import { Tutor } from '../types/tutor.types';
import { SessionLayout } from '../common/SessionLayout';
import SessionSidebar from '../common/SessionSidebar';
import { NoTutorsAvailable } from '../common/NoTutorsAvailable';
import TutorCard from '../common/TutorCard';
import { ChatRequestModal } from './ChatRequestModal';

interface LiveChatClientProps {
  subjectId?: string;
  subjectName?: string;
  theme: string;
  availableTutors: number;
  initialTutors: Tutor[];
}

export default function LiveChatClient({
  subjectId,
  subjectName,
  theme,
  availableTutors,
  initialTutors
}: LiveChatClientProps) {
  const [tutors, setTutors] = useState<Tutor[]>(initialTutors);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [chatStatus, setChatStatus] = useState<'idle' | 'requested' | 'accepted' | 'rejected'>('idle');
  const [loading, setLoading] = useState(false);

  // Refresh available tutors
  useEffect(() => {
    const refreshTutors = async () => {
      if (!subjectId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/tutors/public/search?subjectId=${subjectId}&availableOnly=true`);
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
    const interval = setInterval(refreshTutors, 15000); // Refresh every 15 seconds for live availability

    return () => clearInterval(interval);
  }, [subjectId]);

  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowRequestModal(true);
  };

  const handleChatRequest = async (notes: string, urgency: string) => {
    if (!selectedTutor) return;

    try {
      setChatStatus('requested');
      setShowRequestModal(false);
      
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
          urgency,
          type: 'instant' // Different from booked sessions
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Request sent successfully - now wait for tutor to accept
          alert('Chat request sent! The tutor will respond shortly.');
          // TODO: Set up WebSocket to listen for tutor response
        }
      }
    } catch (error) {
      console.error('Error sending chat request:', error);
      alert('Failed to send chat request');
      setChatStatus('idle');
    }
  };

  const sidebar = (
    <SessionSidebar 
      subjectName={subjectName} 
      availableTutors={availableTutors}
      totalTutors={tutors.length}
      onlineTutors={tutors.filter(t => t.is_available).length}
      chatStatus={chatStatus}
    />
  );

  const mainContent = (
    <div className="flex-1 p-6 overflow-auto">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Checking tutor availability...</div>
        </div>
      ) : tutors.length === 0 ? (
        <NoTutorsAvailable />
      ) : chatStatus === 'requested' ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-green-400 text-lg mb-2">✓ Request Sent!</div>
            <div className="text-white/60">Waiting for {selectedTutor?.username} to accept your chat request...</div>
            <button 
              onClick={() => setChatStatus('idle')}
              className="mt-4 text-white/60 hover:text-white text-sm"
            >
              Cancel Request
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor) => (
            <TutorCard
              key={tutor.tutor_id}
              tutor={tutor}
              viewMode="grid"
              onBookSession={handleTutorSelect}
              actionText="Request Live Chat" // Different from "Book Session"
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
        onConfirm={handleChatRequest}
        tutor={selectedTutor}
        subjectName={subjectName}
        mode="live-chat" // Different from booking mode
      />
    </SessionLayout>
  );
}
