// Database types
export interface DbTutor {
  id: string;
  user_id: string;
  bio: string;
  subjects: string;
  expertise_level: string;
  hourly_rate: number;
  rating: number | null;
  total_sessions: number;
  is_available: boolean;
  response_time?: number;
  jamaican_curriculum: boolean;
  subject_credentials?: string;
  education_background?: string;
  certifications?: string;
}

// App types
export interface AppTutor {
  id: string;
  user_id: string;
  bio: string;
  subjects: string[];
  expertise_level: 'beginner' | 'intermediate' | 'expert';
  hourly_rate: number;
  rating: number | null;
  total_sessions: number;
  is_available: boolean;
  response_time?: number;
  jamaican_curriculum: boolean;
  subject_credentials?: string;
  education_background?: string;
  certifications?: string;
  name?: string;
  email?: string;
}

// Converter
export function dbTutorToAppTutor(dbTutor: DbTutor & { name?: string; email?: string }): AppTutor {
  let subjects: string[] = [];
  try {
    subjects = JSON.parse(dbTutor.subjects);
  } catch {
    subjects = [];
  }

  return {
    ...dbTutor,
    subjects,
    expertise_level: dbTutor.expertise_level as 'beginner' | 'intermediate' | 'expert'
  };
}