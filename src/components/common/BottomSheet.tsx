import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  height?: 'auto' | 'half' | 'full';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs z-40 md:hidden"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col md:max-w-xl md:left-auto md:right-6 md:bottom-6 md:rounded-2xl md:border md:shadow-xl"
          >
            {/* Handle Bar */}
            <div className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            {(title || subtitle) && (
              <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between">
                <div>
                  {title && <h3 className="font-bold text-slate-900 text-base">{title}</h3>}
                  {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Body Content */}
            <div className="p-5 overflow-y-auto max-h-[70vh] flex-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
