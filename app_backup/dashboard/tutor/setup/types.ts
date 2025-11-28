// app/dashboard/tutor/setup/types.ts
export interface UserData {
  username: string;
  email: string;
  role: string;
}

export interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

export interface SetupStatus {
  user: UserData;
  canSetup: boolean;
  hasProfile: boolean;
}

export interface TutorFormData {
  hourlyRate: number;
  expertiseLevel: string;
  bio: string;
  education: string;
  certifications: string;
  jamaicanCurriculum: boolean;
  selectedSubjects: string[];
  teachingPhilosophy: string;
  preferredTeachingTimes: string;
  timezone: string;
  isStudentTutor: boolean;
  responseTime: number;
}

export interface StepProps {
  onUpdate: (updates: Partial<TutorFormData>) => void;
}

export interface SubjectsStepProps extends StepProps {
  subjects: Subject[];
  selectedSubjects: string[];
  onToggleSubject: (subjectId: string) => void;
}

export interface ProfileStepProps extends StepProps {
  bio: string;
  jamaicanCurriculum: boolean;
}

export interface EducationStepProps extends StepProps {
  education: string;
  expertiseLevel: string;
  certifications: string;
  teachingPhilosophy: string;
  isStudentTutor: boolean;
}

export interface AvailabilityStepProps extends StepProps {
  preferredTeachingTimes: string;
  timezone: string;
  responseTime: number;
}

export interface PricingStepProps extends StepProps {
  hourlyRate: number;
}

export interface StepConfig {
  number: number;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}