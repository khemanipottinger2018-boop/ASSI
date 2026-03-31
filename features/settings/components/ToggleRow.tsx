export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white">
        {label}
      </span>

      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition ${
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
