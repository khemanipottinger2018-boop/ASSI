/* ===============================
   Tutor Application – Canonical Types
   =============================== */

/**
 * Represents the review state of a tutor application.
 * This is a workflow state, NOT a user role.
 */
export type TutorApplicationStatus =
  | 'draft'        // saved but not submitted
  | 'pending'      // submitted, under review
  | 'approved'     // accepted → role becomes tutor
  | 'rejected';    // rejected → role reverts to student

/**
 * Input sent from the frontend when creating or updating
 * a tutor application (draft or submission).
 */
export interface TutorApplicationInput {
  educationBackground: string;
  teachingExperience: string;
  whyTutor: string;

  qualifications?: string;

  birthDate: string;        // ISO format: YYYY-MM-DD
  subjectIds: string[];     // REQUIRED: subject IDs, not names
}

/**
 * Full tutor application entity as stored and returned
 * by the backend.
 */
export interface TutorApplication {
  id: string;
  userId: string;

  status: TutorApplicationStatus;

  educationBackground: string;
  teachingExperience: string;
  whyTutor: string;
  qualifications?: string;

  birthDate: string;
  subjectIds: string[];

  // Admin review metadata
  reviewedBy?: string;      // admin userId
  reviewNotes?: string;

  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reviewedAt?: Date;
}
