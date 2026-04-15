import { Suspense } from 'react';

function NotFoundContent() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-semibold text-white mb-3">Page Not Found</h1>
        <p className="text-white/50 mb-8">
          Sorry, the page you are looking for doesn’t exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-block bg-white text-black px-6 py-3 rounded-2xl font-medium hover:bg-white/90 transition"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  );
}