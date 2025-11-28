interface MetricCardProps {
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'purple' | 'yellow';
}

export default function MetricCard({ label, value, color }: MetricCardProps) {
  const colors = {
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300',
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-300',
    yellow: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-4 rounded-xl border`}>
      <p className="text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}