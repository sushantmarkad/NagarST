import React from 'react';
import type { NotificationItem as NotificationType } from '../../types';
import { AlertTriangle, Info, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface NotificationItemProps {
  notification: NotificationType;
  onMarkRead?: (id: string) => void;
}

export const NotificationItemCard: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
}) => {
  const { language } = useLanguage();

  const getIcon = () => {
    switch (notification.severity) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.severity) {
      case 'alert':
        return 'border-l-rose-500';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      onClick={() => onMarkRead?.(notification.id)}
      className={`p-4 rounded-xl border border-slate-200 border-l-4 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer ${getBorderColor()} ${
        !notification.read ? 'bg-slate-50/80 font-medium' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 mt-0.5 shrink-0">{getIcon()}</div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">
                {language === 'mr' ? notification.titleMarathi : notification.title}
              </h4>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-[#0f3c5c]" />
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {language === 'mr' ? notification.messageMarathi : notification.message}
            </p>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {notification.time}
        </span>
      </div>
    </div>
  );
};
