import { Zap, Video, FileText, Download, Share2 } from 'lucide-react';
import ToolButton from './ToolButton';

export default function QuickTools() {
  const tools = [
    { icon: <Video size={20} />, label: 'Record Lesson' },
    { icon: <FileText size={20} />, label: 'Create Material' },
    { icon: <Download size={20} />, label: 'Export Data' },
    { icon: <Share2 size={20} />, label: 'Share Profile' }
  ];

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Zap size={18} />
        Quick Tools
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool, index) => (
          <ToolButton
            key={index}
            icon={tool.icon}
            label={tool.label}
          />
        ))}
      </div>
    </div>
  );
}