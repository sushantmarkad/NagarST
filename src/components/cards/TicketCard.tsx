import React, { useState } from 'react';
import type { Ticket } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { QrCode, ArrowRight, Ticket as TicketIcon, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QRModal } from '../common/QRModal';

interface TicketCardProps {
  ticket: Ticket;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { language } = useLanguage();
  const [showQR, setShowQR] = useState(false);

  const isActive = ticket.status === 'active';

  return (
    <>
      <div
        className={`rounded-2xl border bg-white shadow-2xs relative overflow-hidden transition-all ${
          isActive ? 'border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10' : 'border-slate-200 opacity-90'
        }`}
      >
        {/* Ticket Header Banner */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
              <TicketIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold tracking-wider text-slate-200 block">{ticket.ticketCode}</span>
              <span className="text-[10px] text-slate-400 font-medium">{ticket.busType}</span>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : ticket.status === 'used'
                ? 'bg-slate-700 text-slate-300'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {ticket.status}
          </span>
        </div>

        {/* Perforated Coupon Divider Notch */}
        <div className="relative h-4 bg-white flex items-center justify-between px-[-8px]">
          <div className="w-4 h-4 rounded-full bg-[#FAF9F6] border-r border-slate-200 -ml-2" />
          <div className="w-full border-t-2 border-dashed border-slate-200 mx-1" />
          <div className="w-4 h-4 rounded-full bg-[#FAF9F6] border-l border-slate-200 -mr-2" />
        </div>

        {/* Route Details */}
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              {language === 'mr' ? 'प्रारंभ थांबा' : 'Boarding Stop'}
            </span>
            <span className="font-extrabold text-slate-900 text-sm block mt-0.5">{ticket.sourceStop}</span>
          </div>

          <div className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="flex-1 text-right">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              {language === 'mr' ? 'गंतव्य थांबा' : 'Destination Stop'}
            </span>
            <span className="font-extrabold text-slate-900 text-sm block mt-0.5">{ticket.destinationStop}</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-slate-900 text-lg tabular-nums">
              {formatCurrency(ticket.fare)}{' '}
              <span className="text-xs font-medium text-slate-500">
                ({ticket.passengerCount} {ticket.passengerCount === 1 ? 'Passenger' : 'Passengers'})
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Valid till {ticket.validUntil}</span>
            </div>
          </div>

          {isActive && (
            <button
              onClick={() => setShowQR(true)}
              className="px-4 py-2 bg-[#0f3c5c] text-white text-xs font-extrabold rounded-xl hover:bg-[#0a2a42] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>{language === 'mr' ? 'QR दाखवा' : 'Show Ticket QR'}</span>
            </button>
          )}
        </div>
      </div>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title={language === 'mr' ? 'सक्रिय बस तिकीट' : 'Active Bus Ticket'}
        subtitle={`${ticket.sourceStop} → ${ticket.destinationStop}`}
        code={ticket.ticketCode}
        qrData={ticket.qrData}
      />
    </>
  );
};
