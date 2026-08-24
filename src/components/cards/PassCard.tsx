import React, { useState } from 'react';
import type { BusPass } from '../../types';
import { QrCode, Calendar, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { QRModal } from '../common/QRModal';

interface PassCardProps {
  pass: BusPass;
  onRenew?: (pass: BusPass) => void;
}

export const PassCard: React.FC<PassCardProps> = ({ pass, onRenew }) => {
  const { language } = useLanguage();
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div
        className={`p-5 rounded-2xl border bg-gradient-to-br from-slate-900 via-[#0f3c5c] to-slate-900 text-white shadow-lg relative overflow-hidden`}
      >
        {/* Subtle background graphic */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
              Ahilyanagar Transit Authority
            </span>
            <h3 className="font-bold text-base text-white mt-0.5">
              {language === 'mr' ? pass.titleMarathi : pass.title}
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs text-white border border-white/20">
            {pass.passType.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="my-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs relative z-10">
          <div>
            <span className="text-slate-300 block text-[10px] uppercase font-semibold">
              {language === 'mr' ? 'धारक नाव' : 'Pass Holder'}
            </span>
            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-slate-300" />
              {pass.holderName}
            </span>
          </div>

          <div>
            <span className="text-slate-300 block text-[10px] uppercase font-semibold">
              {language === 'mr' ? 'वैधता मुदत' : 'Valid Until'}
            </span>
            <span className="font-semibold text-white flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-300" />
              {pass.validUntil}
            </span>
          </div>
        </div>

        {pass.institutionOrOrg && (
          <div className="text-xs text-slate-300 font-medium mb-3 relative z-10">
            🏢 {pass.institutionOrOrg}
          </div>
        )}

        <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
          <div>
            <span className="font-mono text-xs text-slate-300 block">{pass.passCode}</span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              {pass.daysRemaining} {language === 'mr' ? 'दिवस शिल्लक' : 'days remaining'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRenew && (
              <button
                onClick={() => onRenew(pass)}
                className="px-3 py-1.5 bg-white/15 text-white hover:bg-white/25 text-xs font-semibold rounded-lg transition-colors"
              >
                {language === 'mr' ? 'नूतनीकरण' : 'Renew'}
              </button>
            )}
            <button
              onClick={() => setShowQR(true)}
              className="px-3.5 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <QrCode className="w-4 h-4 text-[#0f3c5c]" />
              <span>{language === 'mr' ? 'क्यूआर पहा' : 'View Pass QR'}</span>
            </button>
          </div>
        </div>
      </div>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title={language === 'mr' ? 'अहिल्यानगर बस पास' : 'Ahilyanagar Bus Pass'}
        subtitle={`${pass.holderName} • ${pass.passCode}`}
        code={pass.passCode}
        qrData={pass.qrData}
      />
    </>
  );
};
