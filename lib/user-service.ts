import { executeQuery } from '@/lib/database';

export interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string;
  is_available: boolean;
  rating: number | null;
  hourly_rate: number;
  bio: string;
  expertise_level: string;
  subject_credentials: string;
  education_background: string;
  certifications: string;
  display_rating?: string;
  hourly_rate_display?: string;
  formatted_bio?: string;
}

export interface TutorAvailabilityResponse {
  success: boolean;
  hasTutors: boolean;
  availableTutors: number;
  tutors: Tutor[];
  subject: string;
  message: string;
  timestamp?: string;
  usedFallback?: boolean;
}

class UserService {
  /**
   * Check tutor availability for a specific subject
   */
  async checkTutorAvailability(subject: string): Promise<TutorAvailabilityResponse> {
    try {
      console.log('🔍 Checking tutor availability for:', subject);

      // First try OPENJSON query
      try {
        const tutors = await executeQuery<Tutor>(`
          SELECT 
            u.id, 
            u.name, 
            u.email, 
            t.subjects, 
            t.is_available, 
            t.rating, 
            t.hourly_rate, 
            t.bio, 
            t.expertise_level,
            t.subject_credentials,
            t.education_background,
            t.certifications
          FROM tutors t
          JOIN users u ON t.user_id = u.id
          WHERE t.is_available = 1
          AND EXISTS (
            SELECT 1 
            FROM OPENJSON(t.subjects) 
            WHERE value = @subjectParam
          )
        `, [subject]);

        return this.formatTutorResponse(tutors, subject, false);
      } catch (openJsonError) {
        console.log('🔄 OPENJSON failed, trying LIKE query...');
        
        // Fallback to LIKE query
        const tutors = await executeQuery<Tutor>(`
          SELECT 
            u.id, 
            u.name, 
            u.email, 
            t.subjects, 
            t.is_available, 
            t.rating, 
            t.hourly_rate, 
            t.bio, 
            t.expertise_level,
            t.subject_credentials,
            t.education_background,
            t.certifications
          FROM tutors t
          JOIN users u ON t.user_id = u.id
          WHERE t.is_available = 1
          AND t.subjects LIKE '%' + @subjectParam + '%'
        `, [subject]);

        // Additional filtering for LIKE query
        const filteredTutors = tutors.filter(tutor => {
          try {
            const tutorSubjects = JSON.parse(tutor.subjects);
            return Array.isArray(tutorSubjects) && tutorSubjects.includes(subject);
          } catch (error) {
            return tutor.subjects.toLowerCase().includes(subject.toLowerCase());
          }
        });

        return this.formatTutorResponse(filteredTutors, subject, true);
      }

    } catch (error) {
      console.error('💥 Tutor availability check failed:', error);
      throw new Error(`Failed to check tutor availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format tutor response with enhanced data
   */
  private formatTutorResponse(tutors: Tutor[], subject: string, usedFallback: boolean): TutorAvailabilityResponse {
    const enhancedTutors = tutors.map(tutor => ({
      ...tutor,
      subject_credentials: tutor.subject_credentials || this.getDefaultCredentials(subject),
      display_rating: tutor.rating ? `⭐ ${tutor.rating.toFixed(1)}` : 'New Tutor',
      hourly_rate_display: `$${tutor.hourly_rate}/hour`,
      formatted_bio: this.formatBio(tutor.bio, subject)
    }));

    return {
      success: true,
      hasTutors: enhancedTutors.length > 0,
      availableTutors: enhancedTutors.length,
      tutors: enhancedTutors,
      subject: subject,
      message: enhancedTutors.length > 0 
        ? `Found ${enhancedTutors.length} tutor${enhancedTutors.length !== 1 ? 's' : ''} for ${subject}` 
        : `No tutors available for ${subject}`,
      timestamp: new Date().toISOString(),
      usedFallback
    };
  }

  /**
   * Default credentials if none stored in database
   */
  private getDefaultCredentials(subject: string): string {
    const defaultCredentials: { [key: string]: string } = {
      math: 'CXC Grade 2 | Strong Mathematical Foundation',
      mathematics: 'CXC Grade 2 | Strong Mathematical Foundation',
      english: 'CXC Grade 1 | Advanced English Proficiency',
      science: 'CXC Grade 2 | Scientific Methodology',
      history: 'CXC Grade 2 | Historical Analysis',
      geography: 'CXC Grade 3 | Geographic Systems',
      physics: 'CXC Grade 2 | Physics Principles',
      chemistry: 'CXC Grade 2 | Chemical Analysis',
      biology: 'CXC Grade 2 | Biological Sciences',
      it: 'CXC Grade 2 | Information Technology Specialist'
    };
    
    return defaultCredentials[subject.toLowerCase()] || `Qualified ${subject} Tutor`;
  }

  /**
   * Format bio for better display
   */
  private formatBio(bio: string, subject: string): string {
    if (!bio) {
      return `Experienced tutor specializing in ${subject}.`;
    }
    return bio;
  }
}

export const userService = new UserService();