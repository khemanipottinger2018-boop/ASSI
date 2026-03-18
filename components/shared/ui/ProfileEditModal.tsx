'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { UserProfileView } from '@/components/types/profile.view';

interface ProfileEditModalProps {
  profile: UserProfileView;
  onClose: () => void;
  onUpdate: (updated: UserProfileView) => void;
}

export default function ProfileEditModal({
  profile,
  onClose,
  onUpdate,
}: ProfileEditModalProps) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [form, setForm] = useState({
    username: profile.username,
    bio: profile.bio ?? '',
    hourlyRate: profile.hourlyRate ?? '',
    timezone: profile.timezone ?? '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${API_URL}/api/users/me`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.success) onUpdate(data.user);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        onClick={onClose}
        className="absolute inset-0"
      />

      <form
        onSubmit={handleSubmit}
        className="
          relative
          w-full max-w-lg
          rounded-2xl
          bg-white/10 backdrop-blur-xl
          border border-white/10
          p-8 space-y-6
        "
      >
        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition"
        >
          <X size={18} />
        </button>

        {/* HEADER */}
        <div>
          <h2 className="text-xl font-semibold text-white">
            Edit Profile
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Update how you appear on ASSI
          </p>
        </div>

        {/* BASIC INFO */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">
              Username
            </label>
            <input
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
              className="
                w-full px-3 py-2
                rounded-lg
                bg-white/10
                text-white
                placeholder:text-white/40
                focus:outline-none focus:ring-1 focus:ring-indigo-500
              "
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">
              Bio
            </label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) =>
                setForm({ ...form, bio: e.target.value })
              }
              className="
                w-full px-3 py-2
                rounded-lg
                bg-white/10
                text-white
                placeholder:text-white/40
                resize-none
                focus:outline-none focus:ring-1 focus:ring-indigo-500
              "
              placeholder="Tell students a little about yourself…"
            />
          </div>
        </div>

        {/* TUTOR FIELDS */}
        {profile.role === 'tutor' && (
          <div className="
            rounded-xl
            bg-purple-500/10
            border border-purple-500/20
            p-4 space-y-4
          ">
            <h3 className="text-sm font-semibold text-white/90">
              Tutor Details
            </h3>

            <div>
              <label className="block text-sm text-white/70 mb-1">
                Hourly Rate
              </label>
              <input
                type="number"
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm({ ...form, hourlyRate: e.target.value })
                }
                className="
                  w-full px-3 py-2
                  rounded-lg
                  bg-white/10
                  text-white
                  focus:outline-none focus:ring-1 focus:ring-purple-500
                "
                placeholder="$ / hour"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">
                Timezone
              </label>
              <input
                value={form.timezone}
                onChange={(e) =>
                  setForm({ ...form, timezone: e.target.value })
                }
                className="
                  w-full px-3 py-2
                  rounded-lg
                  bg-white/10
                  text-white
                  focus:outline-none focus:ring-1 focus:ring-purple-500
                "
                placeholder="e.g. GMT-5"
              />
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="
              px-4 py-2
              rounded-lg
              text-white/70
              hover:text-white
              transition
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            className="
              px-5 py-2
              rounded-lg
              bg-indigo-600
              hover:bg-indigo-500
              text-white font-medium
              transition
            "
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
