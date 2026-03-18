export default function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-white">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-white/60">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
