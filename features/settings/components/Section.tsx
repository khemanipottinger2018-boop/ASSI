export function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="text-white/80 mt-0.5">
          {icon}
        </div>
        <div>
          <h2 className="text-white font-medium">
            {title}
          </h2>
          <p className="text-xs text-white/60">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}
