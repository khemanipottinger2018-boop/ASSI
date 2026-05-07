import { api } from '@/lib/api/client';

export type MasteryLevel = 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'MASTERED';

export type TopicWithMastery = {
  id:      string;
  name:    string;
  mastery: MasteryLevel | null;
};

export type UnitWithTopics = {
  id:     string;
  name:   string;
  topics: TopicWithMastery[];
};

export type SubjectProgress = {
  subjectId:   string;
  subjectName: string;
  units:       UnitWithTopics[];
};

export type MasteryDistribution = {
  subjectId:   string;
  subjectName: string;
  total:       number;
  emerging:    number;
  developing:  number;
  proficient:  number;
  mastered:    number;
};

export type ProgressMe = {
  subjects: MasteryDistribution[];
};

export type SessionSignalBody = {
  topicId:           string;
  studentConfidence: number;
  tutorObservation?: 'on_track' | 'needs_review' | 'struggling';
};

export type CurriculumTopic = {
  id:   string;
  name: string;
};

export type CurriculumUnit = {
  id:     string;
  name:   string;
  topics: CurriculumTopic[];
};

export type SubjectCurriculum = {
  subjectId:   string;
  subjectName: string;
  units:       CurriculumUnit[];
};

export const progressApi = {
  getProgressMe: () =>
    api.get<{ success: boolean; subjects: MasteryDistribution[] }>('/api/progress/me'),

  getSubjectProgress: (subjectId: string) =>
    api.get<{ success: boolean } & SubjectProgress>(`/api/progress/subject/${subjectId}`),

  postSessionSignal: (body: SessionSignalBody) =>
    api.post<{ success: boolean }>('/api/progress/session-signal', body),

  getSubjectCurriculum: (subjectId: string) =>
    api.get<{ success: boolean } & SubjectCurriculum>(`/api/subjects/${subjectId}/curriculum`),
};
