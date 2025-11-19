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

    console.log('🔍 Fetching tutors for:', subject);

    let dbTutors: (DbTutor & { name: string; email: string })[] = [];
    let usedFallback = false;

    // Try OPENJSON query first
    try {
      dbTutors = await executeQuery<DbTutor & { name: string; email: string }>(`
        SELECT t.*, u.name, u.email
        FROM tutors t
        JOIN users u ON t.user_id = u.id
        WHERE EXISTS (
          SELECT 1 
          FROM OPENJSON(t.subjects) 
          WHERE value = @param0
        )
      `, [subject]);
      
      console.log(`✅ Found ${dbTutors.length} tutors using OPENJSON`);
    } catch (openJsonError) {
      console.log('🔄 OPENJSON failed, trying LIKE query...');
      usedFallback = true;
      
      // Fallback to LIKE query
      dbTutors = await executeQuery<DbTutor & { name: string; email: string }>(`
        SELECT t.*, u.name, u.email
        FROM tutors t
        JOIN users u ON t.user_id = u.id
        WHERE t.subjects LIKE '%' + @param0 + '%'
      `, [subject]);

      // Additional filtering for LIKE query
      dbTutors = dbTutors.filter(tutor => {
        try {
          const tutorSubjects = JSON.parse(tutor.subjects);
          return Array.isArray(tutorSubjects) && tutorSubjects.includes(subject);
        } catch {
          return tutor.subjects.toLowerCase().includes(subject.toLowerCase());
        }
      });

      console.log(`✅ Found ${dbTutors.length} tutors using LIKE fallback`);
    }

    // Convert and enhance tutors
    const tutors = dbTutors.map(dbTutorToAppTutor);
    const enhancedTutors = tutors.map(tutor => ({
      ...tutor,
      subject_credentials: tutor.subject_credentials || getDefaultCredentials(subject),
      display_rating: tutor.rating ? `⭐ ${tutor.rating.toFixed(1)}` : 'New Tutor',
      hourly_rate_display: `$${tutor.hourly_rate}/hour`,
      is_online: tutor.is_available // Keep the availability status for display
    }));

    const responseData = {
      success: true,
      hasTutors: enhancedTutors.length > 0,
      availableTutors: enhancedTutors.length,
      tutors: enhancedTutors,
      subject: subject,
      usedFallback,
      cached: false
    };

    // Cache the result
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json(responseData);

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
    it: 'CXC Grade 2 | Information Technology Specialist',
    physics: 'CXC Grade 2 | Physics Principles',
    chemistry: 'CXC Grade 2 | Chemical Analysis',
    biology: 'CXC Grade 2 | Biological Sciences',
    business: 'CXC Grade 2 | Business Principles',
    accounts: 'CXC Grade 2 | Accounting Specialist',
    spanish: 'CXC Grade 2 | Spanish Language',
    french: 'CXC Grade 2 | French Language'
  };
  return defaultCredentials[subject.toLowerCase()] || `Qualified ${subject} Tutor`;
}