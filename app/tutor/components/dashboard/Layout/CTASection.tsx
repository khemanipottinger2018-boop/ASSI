export default function CTASection() {
  return (
    <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2">
          Ready to Level Up? 🚀
        </h2>
        <p className="text-purple-100 mb-4">
          Unlock premium features and grow your tutoring business
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-white text-purple-600 py-3 px-6 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
            Upgrade to PRO
          </button>
          <button className="bg-white/20 text-white py-3 px-6 rounded-xl font-bold hover:bg-white/30 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}