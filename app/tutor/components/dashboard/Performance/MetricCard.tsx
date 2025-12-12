interface MetricCardProps {
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'orange';
  icon?: React.ComponentType<any>;
}

export default function MetricCard({ label, value, color, icon: Icon }: MetricCardProps) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    purple: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300'
  };

  return (
    <div className={`${colors[color]} p-4 rounded-lg border`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {Icon && (
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}