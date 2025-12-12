export default function LoadingDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="h-32 bg-slate-300 dark:bg-slate-700 rounded-xl" />
              <div className="h-64 bg-slate-300 dark:bg-slate-700 rounded-xl" />
              <div className="h-48 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-slate-300 dark:bg-slate-700 rounded-xl" />
              <div className="h-24 bg-slate-300 dark:bg-slate-700 rounded-xl" />
              <div className="h-40 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}