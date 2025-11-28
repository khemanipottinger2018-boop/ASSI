'use client';

interface EmptySessionViewProps {
  subjectName: string;
}

export const EmptySessionView = ({ subjectName }: EmptySessionViewProps) => {
  return (
    <div className="flex-1 flex items-center justify-center backdrop-blur-sm">
      <div className="text-center text-white/60">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold mb-2 text-white">Select a Tutor</h3>
        <p className="text-sm max-w-md">
          Choose from our verified tutors to start your live {subjectName} session. 
          All sessions are private, secure, and designed for your learning success.
        </p>
      </div>
    </div>
  );
};