import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800">
          {value.toLocaleString()}
        </h3>
      </div>
    </div>
  );
};