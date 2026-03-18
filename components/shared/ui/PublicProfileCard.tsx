import { Star } from 'lucide-react';

export default function PublicProfileCard({
  profile,
}: {
  profile: any;
}) {
  const isTutor = profile.role === 'tutor';

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar profile={profile} />

        <div>
          <h1 className="text-xl font-semibold text-white">
            {profile.displayName || profile.username}
          </h1>

          <p className="text-sm text-gray-300 capitalize">
            {profile.role}
          </p>

          {isTutor && (
            <Rating rating={profile.rating} count={profile.reviewCount} />
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-4 text-sm text-gray-200">
          {profile.bio}
        </p>
      )}

      {/* Tutor-only section */}
      {isTutor && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-white">
            Subjects
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.subjects?.map((s: string) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-white/10 text-xs text-white"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function Avatar({ profile }: { profile: any }) {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.username}
        className="w-16 h-16 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
      {profile.username[0].toUpperCase()}
    </div>
  );
}

function Rating({
  rating,
  count,
}: {
  rating?: number;
  count?: number;
}) {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-yellow-400">
      <Star size={14} fill="currentColor" />
      <span>{rating.toFixed(1)}</span>
      <span className="text-gray-400">
        ({count ?? 0})
      </span>
    </div>
  );
}
