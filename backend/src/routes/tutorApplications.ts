// backend/src/routes/tutor-applications.ts
import express from 'express';
import { db } from '@/config/database';
import { authenticate, AuthRequest, requireAdmin } from '@/middleware/auth';

const router = express.Router();

// ==================== SUBMIT APPLICATION ====================
router.post('/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    const { 
      education_background,
      teaching_experience,
      why_tutor,
      qualifications,
      birth_date,
      subjects // Array of subject UUIDs
    } = req.body;

    // Validation
    if (!education_background || !teaching_experience || !why_tutor || !birth_date) {
      return res.status(400).json({ 
        success: false, 
        error: 'All required fields: education_background, teaching_experience, why_tutor, birth_date' 
      });
    }

    // Check if already a tutor
    if (userRole === 'tutor') {
      return res.status(400).json({ 
        success: false, 
        error: 'Already a tutor' 
      });
    }

    // Check if already applied
    const existingApp = await db.queryOne<{ application_id: string }>(
      `SELECT application_id FROM TutorApplications 
       WHERE user_id = @user_id AND status = 'pending'`,
      { user_id: userId }
    );

    if (existingApp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Already applied. Please wait for review.' 
      });
    }

    // Submit application
    const result = await db.query<{ application_id: string }>(
      `INSERT INTO TutorApplications (
        user_id, education_background, teaching_experience, 
        why_tutor, qualifications, birth_date, status, applied_at
      ) 
      OUTPUT INSERTED.application_id
      VALUES (
        @user_id, @education_background, @teaching_experience,
        @why_tutor, @qualifications, @birth_date, 'pending', GETDATE()
      )`,
      {
        user_id: userId,
        education_background: education_background || '',
        teaching_experience: teaching_experience || '',
        why_tutor: why_tutor || '',
        qualifications: qualifications || '',
        birth_date: birth_date
      }
    );

    const applicationId = result[0]?.application_id;

    // Add subjects (if provided)
    if (subjects && Array.isArray(subjects)) {
      for (const subjectId of subjects) {
        await db.query(
          `INSERT INTO ApplicationSubjects (application_id, subject_id) 
           VALUES (@application_id, @subject_id)`,
          {
            application_id: applicationId,
            subject_id: subjectId
          }
        );
      }
    }

    // Update user role to tutor-applicant
    await db.query(
      `UPDATE Users SET role = 'tutor-applicant' WHERE id = @user_id`,
      { user_id: userId }
    );

    res.json({
      success: true,
      applicationId,
      message: 'Tutor application submitted! Admins will review it soon.'
    });

  } catch (error: any) {
    console.error('Submit application error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit application' 
    });
  }
});

// ==================== GET MY APPLICATION ====================
router.get('/my-application', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const application = await db.queryOne<{
      application_id: string;
      status: string;
      education_background?: string;
      teaching_experience?: string;
      why_tutor?: string;
      qualifications?: string;
      birth_date: string;
      age_verified: boolean;
      applied_at: Date;
      reviewed_at?: Date;
      review_notes?: string;
    }>(
      `SELECT application_id, status, education_background, teaching_experience,
              why_tutor, qualifications, birth_date, age_verified, age_verified_at,
              applied_at, reviewed_at, review_notes
       FROM TutorApplications 
       WHERE user_id = @user_id
       ORDER BY applied_at DESC`,
      { user_id: userId }
    );

    if (!application) {
      return res.json({ 
        success: true, 
        hasApplication: false 
      });
    }

    // Get subjects for this application
    const subjects = await db.query<{
      subject_id: string;
      name: string;
      level: string;
    }>(
      `SELECT s.subject_id, s.name, s.level
       FROM ApplicationSubjects aps
       JOIN Subjects s ON aps.subject_id = s.subject_id
       WHERE aps.application_id = @application_id`,
      { application_id: application.application_id }
    );

    res.json({
      success: true,
      hasApplication: true,
      application: {
        ...application,
        subjects: subjects.map(s => ({
          id: s.subject_id,
          name: s.name,
          level: s.level
        }))
      }
    });

  } catch (error: any) {
    console.error('Get my application error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch application' 
    });
  }
});

// ==================== ADMIN: GET PENDING APPLICATIONS ====================
router.get('/admin/pending', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const applications = await db.query<{
      application_id: string;
      user_id: string;
      username: string;
      email: string;
      education_background?: string;
      teaching_experience?: string;
      why_tutor?: string;
      qualifications?: string;
      birth_date: string;
      applied_at: Date;
    }>(
      `SELECT 
        ta.application_id, ta.user_id, ta.education_background,
        ta.teaching_experience, ta.why_tutor, ta.qualifications,
        ta.birth_date, ta.applied_at,
        u.username, u.email
       FROM TutorApplications ta
       JOIN Users u ON ta.user_id = u.id
       WHERE ta.status = 'pending'
       ORDER BY ta.applied_at ASC`,
      {}
    );

    res.json({
      success: true,
      applications
    });

  } catch (error: any) {
    console.error('Get pending applications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch applications' 
    });
  }
});

// ==================== ADMIN: APPROVE APPLICATION ====================
router.post('/admin/approve/:applicationId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { applicationId } = req.params;
    const { review_notes } = req.body;

    // Get application
    const application = await db.queryOne<{
      user_id: string;
      status: string;
    }>(
      `SELECT user_id, status FROM TutorApplications 
       WHERE application_id = @application_id`,
      { application_id: applicationId }
    );

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Application already reviewed' 
      });
    }

    // Update application
    await db.query(
      `UPDATE TutorApplications 
       SET status = 'approved', reviewed_at = GETDATE(), 
           review_notes = @review_notes, age_verified = 1, age_verified_at = GETDATE()
       WHERE application_id = @application_id`,
      {
        application_id: applicationId,
        review_notes: review_notes || 'Application approved'
      }
    );

    // Change user role to tutor
    await db.query(
      `UPDATE Users SET role = 'tutor' WHERE id = @user_id`,
      { user_id: application.user_id }
    );

    // Create tutor profile
    await db.query(
      `INSERT INTO Tutors (user_id, is_available, is_student_tutor, chat_mode, max_concurrent_chats)
       VALUES (@user_id, 0, 1, 'request', 1)`,
      { user_id: application.user_id }
    );

    // Get subjects from application and add to TutorSubjects
    const subjects = await db.query<{ subject_id: string }>(
      `SELECT subject_id FROM ApplicationSubjects WHERE application_id = @application_id`,
      { application_id: applicationId }
    );

    const tutor = await db.queryOne<{ tutor_id: string }>(
      `SELECT tutor_id FROM Tutors WHERE user_id = @user_id`,
      { user_id: application.user_id }
    );

    if (tutor && subjects.length > 0) {
      for (const subject of subjects) {
        await db.query(
          `INSERT INTO TutorSubjects (tutor_id, subject_id) 
           VALUES (@tutor_id, @subject_id)`,
          {
            tutor_id: tutor.tutor_id,
            subject_id: subject.subject_id
          }
        );
      }
    }

    res.json({
      success: true,
      message: 'Application approved successfully'
    });

  } catch (error: any) {
    console.error('Approve application error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve application' 
    });
  }
});

// ==================== ADMIN: REJECT APPLICATION ====================
router.post('/admin/reject/:applicationId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { applicationId } = req.params;
    const { review_notes } = req.body;

    if (!review_notes || review_notes.trim().length < 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Review notes required (min 5 characters)' 
      });
    }

    // Get application
    const application = await db.queryOne<{
      user_id: string;
      status: string;
    }>(
      `SELECT user_id, status FROM TutorApplications 
       WHERE application_id = @application_id`,
      { application_id: applicationId }
    );

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Application already reviewed' 
      });
    }

    // Update application
    await db.query(
      `UPDATE TutorApplications 
       SET status = 'rejected', reviewed_at = GETDATE(), review_notes = @review_notes
       WHERE application_id = @application_id`,
      {
        application_id: applicationId,
        review_notes: review_notes
      }
    );

    // Change user role back to student
    await db.query(
      `UPDATE Users SET role = 'student' WHERE id = @user_id`,
      { user_id: application.user_id }
    );

    res.json({
      success: true,
      message: 'Application rejected'
    });

  } catch (error: any) {
    console.error('Reject application error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject application' 
    });
  }
});

export default router;