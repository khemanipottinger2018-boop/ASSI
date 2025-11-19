import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { DbTutor, dbTutorToAppTutor } from '@/types';

// Simple in-memory cache (5 minutes)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    if (!subject) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subject parameter is required' 
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `tutors-${subject}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('⚡ Using cached tutor data for:', subject);
      return NextResponse.json(cached.data);
    }

    console.log('🔍 Checking tutor availability for:', subject);

    // Try the main query first
    try {
      const dbTutors = await executeQuery<DbTutor & { name: string; email: string }>(`
        SELECT t.*, u.name, u.email
        FROM tutors t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_available = 1
        AND EXISTS (
          SELECT 1 
          FROM OPENJSON(t.subjects) 
          WHERE value = @param0
        )
      `, [subject]);

      console.log(`✅ Found ${dbTutors.length} tutors using OPENJSON`);

      const tutors = dbTutors.map(dbTutorToAppTutor);
      const enhancedTutors = tutors.map(tutor => ({
        ...tutor,
        subject_credentials: tutor.subject_credentials || getDefaultCredentials(subject),
        display_rating: tutor.rating ? `⭐ ${tutor.rating.toFixed(1)}` : 'New Tutor',
        hourly_rate_display: `$${tutor.hourly_rate}/hour`
      }));

      const responseData = {
        success: true,
        hasTutors: enhancedTutors.length > 0,
        availableTutors: enhancedTutors.length,
        tutors: enhancedTutors,
        subject: subject,
        cached: false
      };

      // Cache the result
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      return NextResponse.json(responseData);

    } catch (openJsonError) {
      console.log('🔄 OPENJSON failed, trying LIKE query...');
      
      // Fallback to LIKE query
      const dbTutors = await executeQuery<DbTutor & { name: string; email: string }>(`
        SELECT t.*, u.name, u.email
        FROM tutors t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_available = 1
        AND t.subjects LIKE '%' + @param0 + '%'
      `, [subject]);

      // Additional filtering for LIKE query
      const filteredTutors = dbTutors.filter(tutor => {
        try {
          const tutorSubjects = JSON.parse(tutor.subjects);
          return Array.isArray(tutorSubjects) && tutorSubjects.includes(subject);
        } catch {
          return tutor.subjects.toLowerCase().includes(subject.toLowerCase());
        }
      });

      console.log(`✅ Found ${filteredTutors.length} tutors using LIKE fallback`);

      const tutors = filteredTutors.map(dbTutorToAppTutor);
      const enhancedTutors = tutors.map(tutor => ({
        ...tutor,
        subject_credentials: tutor.subject_credentials || getDefaultCredentials(subject),
        display_rating: tutor.rating ? `⭐ ${tutor.rating.toFixed(1)}` : 'New Tutor',
        hourly_rate_display: `$${tutor.hourly_rate}/hour`
      }));

      const responseData = {
        success: true,
        hasTutors: enhancedTutors.length > 0,
        availableTutors: enhancedTutors.length,
        tutors: enhancedTutors,
        subject: subject,
        usedFallback: true,
        cached: false
      };

      // Cache the result
      cache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      return NextResponse.json(responseData);
    }

  } catch (error) {
    console.error('💥 Error fetching tutors:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch tutors',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getDefaultCredentials(subject: string): string {
  const defaultCredentials: Record<string, string> = {
    math: 'CXC Grade 2 | Strong Mathematical Foundation',
    english: 'CXC Grade 1 | Advanced English Proficiency', 
    science: 'CXC Grade 2 | Scientific Methodology',
    history: 'CXC Grade 2 | Historical Analysis',
    geography: 'CXC Grade 3 | Geographic Systems',
    it: 'CXC Grade 2 | Information Technology Specialist'
  };
  return defaultCredentials[subject.toLowerCase()] || `Qualified ${subject} Tutor`;
}