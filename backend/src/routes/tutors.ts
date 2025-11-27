import express from 'express';
import { getPool, executeQuery, executeSingle } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// Interfaces based on your actual table structure
interface TutorProfile {
  tutor_id: string;
  user_id: string;
  hourly_rate: number;
  is_available: boolean;
  bio: string;
  teaching_philosophy?: string;
  preferred_teaching_times?: string;
  timezone?: string;
  profile_completed_at?: Date;
  last_profile_update?: Date;
  is_student_tutor: boolean;
  service_tier?: string;
}

interface TutorSubject {
  subject_id: string;
  name: string;
  level: string;
}

interface TutorWithSubjects extends TutorProfile {
  username: string;
  email: string;
  profile_pic?: string;
  subjects: TutorSubject[];
  // These will be calculated fields
  total_sessions?: number;
  avg_rating?: number;
  review_count?: number;
}

interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple cache implementation
class TutorCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  clearTutorCache(tutorId?: string): void {
    if (tutorId) {
      for (const key of this.cache.keys()) {
        if (key.includes(tutorId)) {
          this.cache.delete(key);
        }
      }
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith('tutors-')) {
        this.cache.delete(key);
      }
    }
  }
}

const tutorCache = new TutorCache();

// Helper functions
const getUserId = (req: Request): string => {
  if (!req.user?.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
};

const validatePagination = (page: any, limit: any): PaginationParams => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit) || DEFAULT_PAGE_SIZE));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

const buildTutorResponse = (tutors: any[]): TutorWithSubjects[] => {
  const tutorMap = new Map<string, TutorWithSubjects>();
  
  tutors.forEach((tutor: any) => {
    const subjectInfo: TutorSubject = {
      subject_id: tutor.subject_id,
      name: tutor.subject_name,
      level: tutor.subject_level
    };

    if (tutorMap.has(tutor.tutor_id)) {
      const existingTutor = tutorMap.get(tutor.tutor_id)!;
      if (!existingTutor.subjects.some(s => s.subject_id === tutor.subject_id)) {
        existingTutor.subjects.push(subjectInfo);
      }
    } else {
      tutorMap.set(tutor.tutor_id, {
        tutor_id: tutor.tutor_id,
        user_id: tutor.user_id,
        username: tutor.username,
        email: tutor.email,
        profile_pic: tutor.profile_pic,
        hourly_rate: tutor.hourly_rate,
        is_available: tutor.is_available,
        bio: tutor.bio,
        teaching_philosophy: tutor.teaching_philosophy,
        preferred_teaching_times: tutor.preferred_teaching_times,
        timezone: tutor.timezone,
        profile_completed_at: tutor.profile_completed_at,
        last_profile_update: tutor.last_profile_update,
        is_student_tutor: tutor.is_student_tutor,
        service_tier: tutor.service_tier,
        // Calculated fields
        total_sessions: tutor.total_sessions,
        avg_rating: tutor.avg_rating,
        review_count: tutor.review_count,
        subjects: [subjectInfo]
      });
    }
  });

  return Array.from(tutorMap.values());
};

// ===== TUTOR SETUP & MANAGEMENT =====

// Create or update tutor profile
router.post('/setup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const {
      hourly_rate,
      bio,
      teaching_philosophy,
      preferred_teaching_times,
      timezone,
      is_student_tutor = false,
      service_tier = 'standard',
      is_available = true
    } = req.body;

    // Validation
    if (!hourly_rate || hourly_rate < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid hourly rate is required'
      });
    }

    // Check user role and existence
    const user = await executeSingle<{ role: string }>(
      'SELECT role FROM Users WHERE id = @user_id',
      { user_id: { value: userId } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'tutor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Tutor approval required.'
      });
    }

    // Check for existing tutor profile
    const existingTutor = await executeSingle<{ tutor_id: string }>(
      'SELECT tutor_id FROM Tutors WHERE user_id = @user_id',
      { user_id: { value: userId } }
    );

    let tutorId: string;

    if (existingTutor) {
      // Update existing profile
      await executeQuery(
        `UPDATE Tutors 
         SET hourly_rate = @hourly_rate, 
             is_available = @is_available,
             bio = @bio,
             teaching_philosophy = @teaching_philosophy,
             preferred_teaching_times = @preferred_teaching_times,
             timezone = @timezone,
             is_student_tutor = @is_student_tutor,
             service_tier = @service_tier,
             last_profile_update = GETDATE()
         WHERE user_id = @user_id`,
        {
          user_id: { value: userId },
          hourly_rate: { value: hourly_rate, type: sql.Decimal(10, 2) },
          is_available: { value: is_available, type: sql.Bit },
          bio: { value: bio || '' },
          teaching_philosophy: { value: teaching_philosophy || '' },
          preferred_teaching_times: { value: preferred_teaching_times || '' },
          timezone: { value: timezone || '' },
          is_student_tutor: { value: is_student_tutor, type: sql.Bit },
          service_tier: { value: service_tier }
        }
      );
      tutorId = existingTutor.tutor_id;
      console.log('✅ Tutor profile updated:', tutorId);
    } else {
      // Create new profile
      const result = await executeQuery<{ tutor_id: string }>(
        `INSERT INTO Tutors (
          user_id, hourly_rate, is_available, bio, teaching_philosophy,
          preferred_teaching_times, timezone, is_student_tutor, service_tier, profile_completed_at
        ) OUTPUT INSERTED.tutor_id
         VALUES (
           @user_id, @hourly_rate, @is_available, @bio, @teaching_philosophy,
           @preferred_teaching_times, @timezone, @is_student_tutor, @service_tier, GETDATE()
         )`,
        {
          user_id: { value: userId },
          hourly_rate: { value: hourly_rate, type: sql.Decimal(10, 2) },
          is_available: { value: is_available, type: sql.Bit },
          bio: { value: bio || '' },
          teaching_philosophy: { value: teaching_philosophy || '' },
          preferred_teaching_times: { value: preferred_teaching_times || '' },
          timezone: { value: timezone || '' },
          is_student_tutor: { value: is_student_tutor, type: sql.Bit },
          service_tier: { value: service_tier }
        }
      );
      tutorId = result[0].tutor_id;
      console.log('✅ Tutor profile created:', tutorId);
    }

    // Clear cache
    tutorCache.clearTutorCache(tutorId);

    res.json({
      success: true,
      message: `Tutor profile ${existingTutor ? 'updated' : 'created'} successfully`,
      data: { tutor_id: tutorId }
    });

  } catch (error: any) {
    console.error('❌ Tutor setup error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to setup tutor profile'
    });
  }
});

// Manage tutor subjects
router.post('/subjects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { subjects, action = 'add' } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subjects array is required'
      });
    }

    // Get tutor_id
    const tutor = await executeSingle<{ tutor_id: string }>(
      'SELECT tutor_id FROM Tutors WHERE user_id = @user_id',
      { user_id: { value: userId } }
    );

    if (!tutor) {
      return res.status(404).json({
        success: false,
        error: 'Tutor profile not found'
      });
    }

    const tutorId = tutor.tutor_id;

    if (action === 'add') {
      // Add subjects (ignore duplicates)
      for (const subjectId of subjects) {
        await executeQuery(
          `IF NOT EXISTS (
            SELECT 1 FROM TutorSubjects 
            WHERE tutor_id = @tutor_id AND subject_id = @subject_id
          )
          BEGIN
            INSERT INTO TutorSubjects (tutor_id, subject_id) 
            VALUES (@tutor_id, @subject_id)
          END`,
          {
            tutor_id: { value: tutorId },
            subject_id: { value: subjectId }
          }
        );
      }
    } else if (action === 'remove') {
      // Remove subjects
      await executeQuery(
        'DELETE FROM TutorSubjects WHERE tutor_id = @tutor_id AND subject_id IN (@subject_ids)',
        {
          tutor_id: { value: tutorId },
          subject_ids: { value: subjects.join(',') }
        }
      );
    } else if (action === 'replace') {
      // Replace all subjects
      const transaction = new sql.Transaction(await getPool());
      
      try {
        await transaction.begin();
        
        // Remove existing subjects
        await transaction.request()
          .input('tutor_id', tutorId)
          .query('DELETE FROM TutorSubjects WHERE tutor_id = @tutor_id');
        
        // Add new subjects
        for (const subjectId of subjects) {
          await transaction.request()
            .input('tutor_id', tutorId)
            .input('subject_id', subjectId)
            .query('INSERT INTO TutorSubjects (tutor_id, subject_id) VALUES (@tutor_id, @subject_id)');
        }
        
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    console.log(`✅ ${action === 'remove' ? 'Removed' : 'Updated'} ${subjects.length} subjects for tutor ${tutorId}`);

    // Clear cache
    tutorCache.clearTutorCache(tutorId);

    res.json({
      success: true,
      message: `Successfully ${action === 'remove' ? 'removed' : 'added'} ${subjects.length} subjects`
    });

  } catch (error: any) {
    console.error('❌ Tutor subjects error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update tutor subjects'
    });
  }
});

// ===== PUBLIC TUTOR BROWSING & MATCHING =====

// Get all tutors with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, subjectId, minRate, maxRate, studentTutor, serviceTier } = req.query;
    const { offset, limit: pageSize } = validatePagination(page, limit);
    
    // Build cache key
    const cacheKey = `tutors-${JSON.stringify(req.query)}`;
    const cached = tutorCache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Serving tutors from cache');
      return res.json(cached);
    }

    // Build WHERE conditions
    const conditions: string[] = ['t.is_available = 1'];
    const inputs: any = {
      offset: { value: offset, type: sql.Int },
      pageSize: { value: pageSize, type: sql.Int }
    };

    if (subjectId) {
      conditions.push('ts.subject_id = @subject_id');
      inputs.subject_id = { value: subjectId };
    }

    if (minRate) {
      conditions.push('t.hourly_rate >= @min_rate');
      inputs.min_rate = { value: parseFloat(minRate as string), type: sql.Decimal(10, 2) };
    }

    if (maxRate) {
      conditions.push('t.hourly_rate <= @max_rate');
      inputs.max_rate = { value: parseFloat(maxRate as string), type: sql.Decimal(10, 2) };
    }

    if (studentTutor !== undefined) {
      conditions.push('t.is_student_tutor = @student_tutor');
      inputs.student_tutor = { value: studentTutor === 'true', type: sql.Bit };
    }

    if (serviceTier) {
      conditions.push('t.service_tier = @service_tier');
      inputs.service_tier = { value: serviceTier };
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tutors = await executeQuery(`
      SELECT 
        t.tutor_id, t.user_id, t.hourly_rate, t.is_available,
        t.bio, t.teaching_philosophy, t.preferred_teaching_times,
        t.timezone, t.profile_completed_at, t.last_profile_update,
        t.is_student_tutor, t.service_tier,
        u.username, u.email, u.profile_pic,
        s.subject_id, s.name as subject_name, s.level as subject_level,
        -- Calculate total sessions
        (SELECT COUNT(*) FROM BookedSessions bs WHERE bs.tutor_id = t.tutor_id AND bs.status = 'completed') as total_sessions,
        -- Calculate average rating
        (SELECT AVG(CAST(sr.rating AS FLOAT)) FROM SessionReviews sr WHERE sr.tutor_id = t.tutor_id) as avg_rating,
        -- Calculate review count
        (SELECT COUNT(*) FROM SessionReviews sr WHERE sr.tutor_id = t.tutor_id) as review_count
      FROM Tutors t
      INNER JOIN Users u ON t.user_id = u.id
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      INNER JOIN Subjects s ON ts.subject_id = s.subject_id
      ${whereClause}
      ORDER BY u.username, s.name
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, inputs);

    const formattedTutors = buildTutorResponse(tutors);
    
    // Get total count for pagination
    const countResult = await executeSingle<{ total: number }>(`
      SELECT COUNT(DISTINCT t.tutor_id) as total
      FROM Tutors t
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      ${whereClause}
    `, inputs);

    const response = {
      success: true,
      data: formattedTutors,
      pagination: {
        page: parseInt(page as string) || 1,
        limit: pageSize,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / pageSize)
      }
    };

    // Cache the response
    tutorCache.set(cacheKey, response);
    
    console.log(`✅ Found ${formattedTutors.length} tutors`);
    res.json(response);

  } catch (error: any) {
    console.error('❌ Error fetching tutors:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tutors'
    });
  }
});

// Get tutors by subject (optimized for your landing page selector)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { subjectId, page, limit } = req.query;
    
    console.log('🔍 Searching tutors for subject ID:', subjectId);
    
    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'subjectId query parameter is required'
      });
    }

    const { offset, limit: pageSize } = validatePagination(page, limit);
    const cacheKey = `tutors-search-${subjectId}-${page}-${limit}`;
    const cached = tutorCache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Serving search from cache');
      return res.json(cached);
    }

    console.log('📊 Executing SQL query for tutors...');

    // SIMPLIFIED SQL QUERY - Remove any potentially problematic columns
    const tutors = await executeQuery(`
      SELECT 
        t.tutor_id, 
        t.user_id, 
        t.hourly_rate, 
        t.is_available,
        t.bio,
        u.username, 
        u.email, 
        u.profile_pic,
        s.subject_id, 
        s.name as subject_name, 
        s.level as subject_level
      FROM Tutors t
      INNER JOIN Users u ON t.user_id = u.id
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      INNER JOIN Subjects s ON ts.subject_id = s.subject_id
      WHERE t.is_available = 1 AND ts.subject_id = @subject_id
      ORDER BY u.username
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `, {
      subject_id: { value: subjectId },
      offset: { value: offset, type: sql.Int },
      pageSize: { value: pageSize, type: sql.Int }
    });

    console.log(`✅ Found ${tutors.length} raw tutor records`);

    const formattedTutors = buildTutorResponse(tutors);
    
    const countResult = await executeSingle<{ total: number }>(`
      SELECT COUNT(DISTINCT t.tutor_id) as total
      FROM Tutors t
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      WHERE t.is_available = 1 AND ts.subject_id = @subject_id
    `, { subject_id: { value: subjectId } });

    const response = {
      success: true,
      data: formattedTutors,
      pagination: {
        page: parseInt(page as string) || 1,
        limit: pageSize,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / pageSize)
      }
    };

    tutorCache.set(cacheKey, response);
    
    console.log(`✅ Found ${formattedTutors.length} tutors for subject ${subjectId}`);
    res.json(response);

  } catch (error: any) {
    console.error('❌ Error searching tutors:', error.message);
    console.error('❌ Full error details:', error);
    
    // Return detailed error for debugging
    res.status(500).json({ 
      success: false,
      error: 'Failed to search tutors',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single tutor profile
router.get('/:tutorId', async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const cacheKey = `tutor-${tutorId}`;
    const cached = tutorCache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const tutors = await executeQuery(`
      SELECT 
        t.tutor_id, t.user_id, t.hourly_rate, t.is_available,
        t.bio, t.teaching_philosophy, t.preferred_teaching_times,
        t.timezone, t.profile_completed_at, t.last_profile_update,
        t.is_student_tutor, t.service_tier,
        u.username, u.email, u.profile_pic,
        s.subject_id, s.name as subject_name, s.level as subject_level
      FROM Tutors t
      INNER JOIN Users u ON t.user_id = u.id
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      INNER JOIN Subjects s ON ts.subject_id = s.subject_id
      WHERE t.tutor_id = @tutor_id
      ORDER BY s.name
    `, { tutor_id: { value: tutorId } });

    if (tutors.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tutor not found'
      });
    }

    const formattedTutor = buildTutorResponse(tutors)[0];
    const response = {
      success: true,
      data: formattedTutor
    };

    tutorCache.set(cacheKey, response);
    res.json(response);

  } catch (error: any) {
    console.error('❌ Error fetching tutor:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tutor profile'
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthy = await executeSingle<{ health_check: number }>('SELECT 1 as health_check');
    
    res.json({
      success: true,
      database: healthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      cache: {
        size: (tutorCache as any).cache.size
      }
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Database health check failed: ' + error.message
    });
  }
});

export default router;