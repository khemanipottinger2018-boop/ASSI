// components/types/domain.types.ts
// Shapes used across student/tutor dashboard components.
// All fields verified against backend contract.

export type ActiveChat = {
  id:          string;
  tutorId:     string;
  tutorName:   string;
  subject:     string;
  startedAt:   string;
};

export type AvailableTutor = {
  tutorId:    string;   // tutors table PK
  userId:     string;   // auth user FK — always different from tutorId
  username:   string;
  bio:        string;
  hourlyRate: number;
  chatMode:   string | null;
  subjects:   { id: string; name: string; category: string | null }[];
};

export type RecentSession = {
  id:          string;
  tutorName:   string;
  subject:     string;
  endedAt:     string;
  rating:      number | 'Not rated';
};