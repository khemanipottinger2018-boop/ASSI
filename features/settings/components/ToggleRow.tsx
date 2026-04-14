export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm text-white">{label}</span>
        {description && (
          <span className="text-[11px] text-white/65 leading-snug">{description}</span>
        )}
      </div>

      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition flex-shrink-0 ${
          value
            ? 'bg-purple-500'
            : 'bg-white/20'
        }`}
      >
        <span
          className={`block w-4 h-4 bg-white rounded-full translate-y-1 transition ${
            value
              ? 'translate-x-5'
              : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
