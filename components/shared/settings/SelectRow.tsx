export function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white">
        {label}
      </span>

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
      >
        {options.map(o => (
          <option
            key={o.value}
            value={o.value}
            className="text-black"
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
