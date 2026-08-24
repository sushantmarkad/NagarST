import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { NotificationItemCard } from '../components/cards/NotificationItem';
import { Bell, CheckCheck } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { t } = useLanguage();
  const { notifications, markNotificationRead } = useApp();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredNotifications =
    filterCategory === 'all'
      ? notifications
      : notifications.filter((n) => n.category === filterCategory);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0f3c5c] flex items-center justify-center border border-blue-100 relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t('Notification Center', 'सूचना केंद्र')}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t('Transit service disruptions, ETA updates, and pass reminders', 'सेवा बदल, उशीर व पास स्मरणपत्रे')}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
            className="px-3.5 py-2 text-xs font-semibold text-[#0f3c5c] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{t('Mark all as read', 'सर्व वाचले म्हणून चिन्हांकित करा')}</span>
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Updates' },
          { id: 'service_alert', label: 'Service Alerts' },
          { id: 'delay', label: 'Bus Delays' },
          { id: 'pass_reminder', label: 'Pass Reminders' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              filterCategory === tab.id
                ? 'bg-[#0f3c5c] text-white border-[#0f3c5c] shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <NotificationItemCard
              key={notif.id}
              notification={notif}
              onMarkRead={markNotificationRead}
            />
          ))
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            {t('No notifications found in this category.', 'या श्रेणीमध्ये कोणत्याही सूचना नाहीत.')}
          </div>
        )}
      </div>
    </div>
  );
};
