import React from 'react';
import { Clock } from 'lucide-react';

interface ETAIndicatorProps {
  minutes: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ETAIndicator: React.FC<ETAIndicatorProps> = ({ minutes, label = 'Arriving in', size = 'md' }) => {
  const isUrgent = minutes <= 3;
  const isModerate = minutes > 3 && minutes <= 10;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses = isUrgent
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : isModerate
    ? 'bg-blue-50 text-blue-800 border-blue-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border ${sizeClasses[size]} ${colorClasses}`}>
      <Clock className="w-3.5 h-3.5 opacity-75 shrink-0" />
      <span>
        {label && <span className="font-normal text-xs text-slate-500 mr-1">{label}</span>}
        <span className="font-bold">{minutes} min</span>
      </span>
    </div>
  );
};
