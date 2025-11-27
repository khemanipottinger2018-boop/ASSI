// backend/src/routes/tutorApplications.ts
import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// Age verification utility function
const calculateAgeFromDOB = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Age verification middleware
const verifyAgeMiddleware = (req: Request, res: Response, next: Function) => {
  const { birth_date } = req.body;

  if (!birth_date) {
    return res.status(400).json({
      success: false,
      error: 'Date of birth is required for age verification'
    });
  }

  const age = calculateAgeFromDOB(birth_date);
  
  if (age < 18) {
    return res.status(403).json({
      success: false,
      error: 'You must be 18 years or older to become a tutor. Current age: ' + age
    });
  }

  next();
};

// Apply to become a tutor - UPDATED WITH AGE VERIFICATION
router.post('/apply', authenticateToken, verifyAgeMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userId = req.user.id;
    const { 
      subjects, 
      education_background, 
      teaching_experience,
      why_tutor,
      qualifications,
      birth_date  // NEW: Added birth_date from request body
    } = req.body;

    const pool = await getPool();

    // Check if user already has an application
    const existingApp = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT application_id FROM TutorApplications WHERE user_id = @user_id AND status IN (\'pending\', \'approved\')');

    if (existingApp.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending or approved tutor application'
      });
    }

    // Calculate age for database storage
    const age = calculateAgeFromDOB(birth_date);

    // Create tutor application - UPDATED WITH BIRTH_DATE AND AGE
    const result = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .input('education_background', sql.VarChar, education_background)
      .input('teaching_experience', sql.VarChar, teaching_experience)
      .input('why_tutor', sql.VarChar, why_tutor)
      .input('qualifications', sql.VarChar, qualifications)
      .input('birth_date', sql.Date, birth_date)  // NEW
      .input('age', sql.Int, age)  // NEW
      .query(`
        INSERT INTO TutorApplications (
          user_id, education_background, teaching_experience, 
          why_tutor, qualifications, birth_date, age, status, applied_at
        ) 
        OUTPUT INSERTED.application_id
        VALUES (
          @user_id, @education_background, @teaching_experience,
          @why_tutor, @qualifications, @birth_date, @age, 'pending', GETDATE()
        )
      `);

    const applicationId = result.recordset[0].application_id;

    // Add subjects to application (existing code)
    if (subjects && Array.isArray(subjects)) {
      for (const subjectId of subjects) {
        await pool.request()
          .input('application_id', sql.VarChar, applicationId)
          .input('subject_id', sql.VarChar, subjectId)
          .query(`
            INSERT INTO ApplicationSubjects (application_id, subject_id)
            VALUES (@application_id, @subject_id)
          `);
      }
    }

    res.json({
      success: true,
      message: 'Tutor application submitted successfully',
      data: { 
        application_id: applicationId,
        age_verified: true,
        age: age
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error creating tutor application:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit tutor application',
      details: errorMessage
    });
  }
});

// Update other routes to include age information in responses...

// Get all pending applications (admin only) - UPDATED
router.get('/pending', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        ta.application_id, ta.user_id, ta.education_background,
        ta.teaching_experience, ta.why_tutor, ta.qualifications,
        ta.birth_date, ta.age,  -- NEW
        ta.applied_at, ta.reviewed_at, ta.review_notes,
        u.username, u.email, u.created_at as user_joined
      FROM TutorApplications ta
      INNER JOIN Users u ON ta.user_id = u.id
      WHERE ta.status = 'pending'
      ORDER BY ta.applied_at ASC
    `);

    // Get subjects for each application (existing code)
    const applicationsWithSubjects = await Promise.all(
      result.recordset.map(async (app: any) => {
        const subjectsResult = await pool.request()
          .input('application_id', sql.VarChar, app.application_id)
          .query(`
            SELECT s.subject_id, s.name, s.level
            FROM ApplicationSubjects aps
            INNER JOIN Subjects s ON aps.subject_id = s.subject_id
            WHERE aps.application_id = @application_id
          `);

        return {
          ...app,
          subjects: subjectsResult.recordset
        };
      })
    );

    res.json({
      success: true,
      data: applicationsWithSubjects,
      count: applicationsWithSubjects.length
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching pending applications:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending applications',
      details: errorMessage
    });
  }
});

// Check user's application status - UPDATED
router.get('/my-application', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userId = req.user.id;
    const pool = await getPool();

    const result = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query(`
        SELECT 
          application_id, status, education_background,
          teaching_experience, why_tutor, qualifications,
          birth_date, age,  -- NEW
          applied_at, reviewed_at, review_notes
        FROM TutorApplications 
        WHERE user_id = @user_id
        ORDER BY applied_at DESC
      `);

    if (result.recordset.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const application = result.recordset[0];

    // Get subjects for the application
    const subjectsResult = await pool.request()
      .input('application_id', sql.VarChar, application.application_id)
      .query(`
        SELECT s.subject_id, s.name, s.level
        FROM ApplicationSubjects aps
        INNER JOIN Subjects s ON aps.subject_id = s.subject_id
        WHERE aps.application_id = @application_id
      `);

    res.json({
      success: true,
      data: {
        ...application,
        subjects: subjectsResult.recordset
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching user application:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch application status',
      details: errorMessage
    });
  }
});

export default router;