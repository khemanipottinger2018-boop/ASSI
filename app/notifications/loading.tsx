export default function NotificationsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-white/10 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-xl"
          >
            <div className="flex justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-64 max-w-full rounded bg-white/10 animate-pulse" />
              </div>
              <div className="mt-1 h-2 w-2 rounded-full bg-white/10 animate-pulse shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}