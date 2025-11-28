// app/tutors/page.tsx - SERVER COMPONENT (pure server-side!)
import { BackgroundEffects } from '../../chat/sessions/components/BackgroundEffects';
import { ThemeName } from "@/types/tutor.types";
import TutorLiveChatWrapper from '../components/TutorLiveChatWrapper';

interface PageProps {
  searchParams: Promise<{
    subjectId?: string;
    subjectName?: string;
    theme?: string;
    availableTutors?: string;
  }>
}

async function getTutorsBySubject(subjectId: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/tutors/public/search?subjectId=${subjectId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tutors');
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return [];
  }
}

export default async function TutorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { subjectId, subjectName, theme = 'default', availableTutors } = params;

  // Heavy lifting stays on server ✅
  const tutors = subjectId ? await getTutorsBySubject(subjectId) : [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundEffects theme={theme as ThemeName} />
      
      <div className="relative z-10">
        {/* Client wrapper handles the dynamic import */}
        <TutorLiveChatWrapper
          subjectId={subjectId}
          subjectName={subjectName}
          theme={theme as ThemeName}
          availableTutors={parseInt(availableTutors || '0')}
          initialTutors={tutors}
        />
      </div>
    </div>
  );
}
