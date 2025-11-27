"use client";

import dynamic from 'next/dynamic';
import { ThemeName } from '../types/tutor.types';

interface Tutor {
  tutor_id: string;
  user_id: string;
  username: string;
  // ... other tutor fields
}

interface TutorLiveChatWrapperProps {
  subjectId?: string;
  subjectName?: string;
  theme: ThemeName;
  availableTutors: number;
  initialTutors: Tutor[];
}

// Dynamically import the client component WITH SSR disabled
const TutorLiveChatClient = dynamic(
  () => import('../../../components/tutors/live-chat/TutorLiveChatClient'),
  { 
    ssr: false,
    loading: () => <div className="text-white p-4">Loading chat interface...</div>
  }
);

export default function TutorLiveChatWrapper(props: TutorLiveChatWrapperProps) {
  return <TutorLiveChatClient {...props} />;
}
