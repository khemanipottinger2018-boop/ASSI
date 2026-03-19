import { Star } from 'lucide-react';
import type { UserProfileView } from '@/components/types/profile.view';

export default function PublicProfileCard({
  profile,
}: {
  profile: UserProfileView;
}) {
  const isTutor = profile.role === 'tutor';

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar username={profile.username} />

        <div>
          <h1 className="text-xl font-semibold text-white">
            {profile.username}
          </h1>

          <p className="text-sm text-gray-300 capitalize">
            {profile.role === 'tutor_applicant' ? 'Tutor Applicant' : profile.role}
          </p>

          {isTutor && <Rating />}
        </div>
      </div>

      {/* Bio — backend returns tutorBio on public profile, not bio */}
      {profile.tutorBio && (
        <p className="mt-4 text-sm text-gray-200">
          {profile.tutorBio}
        </p>
      )}

      {/* Hourly rate */}
      {isTutor && profile.hourlyRate != null && (
        <p className="mt-2 text-sm text-white/60">
          ${profile.hourlyRate} / hr
        </p>
      )}

      {/* Subjects */}
      {isTutor && profile.subjects && profile.subjects.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-white">Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {profile.subjects.map((s) => (
              <span
                key={s.id}
                className="px-3 py-1 rounded-full bg-white/10 text-xs text-white"
              >
                {s.name}
                {s.category && (
                  <span className="ml-1 opacity-50">· {s.category}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

// Backend does not return avatarUrl — always use initials fallback
function Avatar({ username }: { username: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
      {username[0].toUpperCase()}
    </div>
  );
}

// Rating stubbed — backend doesn't return rating on public profile endpoint yet
function Rating() {
  return null;
}