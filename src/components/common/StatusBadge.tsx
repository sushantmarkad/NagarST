import React from 'react';
import type { OccupancyLevel, BusStatus } from '../../types';
import { getOccupancyConfig, getStatusConfig } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface OccupancyBadgeProps {
  level: OccupancyLevel;
  compact?: boolean;
}

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({ level, compact }) => {
  const { language } = useLanguage();
  const config = getOccupancyConfig(level);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border ${
        compact ? 'px-2 py-0.5 text-xs rounded-md' : 'px-2.5 py-1 text-xs rounded-full'
      } ${config.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span>{language === 'mr' ? config.labelMarathi : config.label}</span>
    </span>
  );
};

interface BusStatusBadgeProps {
  status: BusStatus;
  delayMinutes?: number;
}

export const BusStatusBadge: React.FC<BusStatusBadgeProps> = ({ status, delayMinutes }) => {
  const { language } = useLanguage();
  const config = getStatusConfig(status, delayMinutes);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${config.color}`}>
      {language === 'mr' ? config.labelMarathi : config.label}
    </span>
  );
};
