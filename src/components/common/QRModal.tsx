import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
  qrData: string;
  subtitle?: string;
  status?: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  title,
  code,
  subtitle,
}) => {
  const { language } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}

            <div className="my-5 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              {/* Custom SVG QR Code Representation */}
              <div className="relative p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <svg
                  className="w-48 h-48"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer corners */}
                  <rect x="5" y="5" width="26" height="26" rx="3" fill="#0f3c5c" />
                  <rect x="9" y="9" width="18" height="18" fill="white" />
                  <rect x="13" y="13" width="10" height="10" fill="#0f3c5c" />

                  <rect x="69" y="5" width="26" height="26" rx="3" fill="#0f3c5c" />
                  <rect x="73" y="9" width="18" height="18" fill="white" />
                  <rect x="77" y="13" width="10" height="10" fill="#0f3c5c" />

                  <rect x="5" y="69" width="26" height="26" rx="3" fill="#0f3c5c" />
                  <rect x="9" y="73" width="18" height="18" fill="white" />
                  <rect x="13" y="77" width="10" height="10" fill="#0f3c5c" />

                  {/* QR Patterns */}
                  <rect x="36" y="8" width="6" height="6" fill="#0f3c5c" />
                  <rect x="46" y="8" width="16" height="6" fill="#0f3c5c" />
                  <rect x="36" y="18" width="12" height="6" fill="#0f3c5c" />
                  <rect x="52" y="18" width="10" height="6" fill="#0f3c5c" />
                  <rect x="36" y="28" width="6" height="6" fill="#0f3c5c" />
                  <rect x="46" y="28" width="16" height="6" fill="#0f3c5c" />

                  {/* Middle row */}
                  <rect x="8" y="36" width="6" height="12" fill="#0f3c5c" />
                  <rect x="18" y="36" width="12" height="6" fill="#0f3c5c" />
                  <rect x="36" y="38" width="26" height="26" rx="4" fill="#0f3c5c" />
                  <path d="M49 46 L53 50 L61 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="68" y="36" width="12" height="6" fill="#0f3c5c" />
                  <rect x="84" y="36" width="8" height="12" fill="#0f3c5c" />

                  {/* Bottom section */}
                  <rect x="36" y="68" width="14" height="6" fill="#0f3c5c" />
                  <rect x="54" y="68" width="14" height="6" fill="#0f3c5c" />
                  <rect x="72" y="68" width="20" height="6" fill="#0f3c5c" />
                  <rect x="36" y="78" width="8" height="14" fill="#0f3c5c" />
                  <rect x="48" y="78" width="18" height="6" fill="#0f3c5c" />
                  <rect x="70" y="78" width="22" height="14" fill="#0f3c5c" />
                </svg>
              </div>

              <div className="mt-3 font-mono font-bold text-xs text-slate-800 tracking-wider">
                {code}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {language === 'mr'
                  ? 'अहिल्यानगर परिवहन प्राधिकरणाद्वारे डिजिटल सत्यापित'
                  : 'Digitally verified by Ahilyanagar Transit Authority'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 bg-[#0f3c5c] text-white text-xs font-semibold rounded-xl hover:bg-[#0a2a42] transition-colors"
            >
              {language === 'mr' ? 'बंद करा' : 'Close'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
