interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
}

export default function ToolButton({ icon, label }: ToolButtonProps) {
  return (
    <button className="bg-white/10 text-white p-3 rounded-xl hover:bg-white/20 transition-colors flex flex-col items-center gap-2">
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}