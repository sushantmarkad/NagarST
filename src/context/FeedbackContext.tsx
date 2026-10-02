import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: 'danger' | 'warning' | 'brand' | 'default';
}

export interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'textarea' | 'number';
  required?: boolean;
}

interface FeedbackContextType {
  toast: {
    show: (message: string, type?: ToastType, title?: string, duration?: number) => void;
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Toasts State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastMethods = {
    show: showToast,
    success: (msg: string, title = 'Success', dur = 3500) => showToast(msg, 'success', title, dur),
    error: (msg: string, title = 'Error', dur = 5000) => showToast(msg, 'error', title, dur),
    warning: (msg: string, title = 'Notice', dur = 4000) => showToast(msg, 'warning', title, dur),
    info: (msg: string, title = 'Information', dur = 3500) => showToast(msg, 'info', title, dur),
  };

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  // Prompt Dialog State
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions;
    value: string;
    error: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const promptInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        options,
        value: options.defaultValue || '',
        error: '',
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    if (promptState?.isOpen) {
      setTimeout(() => {
        promptInputRef.current?.focus();
      }, 50);
    }
  }, [promptState?.isOpen]);

  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptState) return;

    if (promptState.options.required && !promptState.value.trim()) {
      setPromptState((prev) => prev ? { ...prev, error: 'This field cannot be empty.' } : null);
      return;
    }

    promptState.resolve(promptState.value.trim());
    setPromptState(null);
  };

  const handlePromptCancel = () => {
    if (promptState) {
      promptState.resolve(null);
      setPromptState(null);
    }
  };

  // Global Escape key listener for dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmState) handleConfirmClose(false);
        if (promptState) handlePromptCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, promptState]);

  return (
    <FeedbackContext.Provider
      value={{
        toast: toastMethods,
        confirm,
        prompt,
      }}
    >
      {children}

      {/* TOAST NOTIFICATION CONTAINER */}
      <div 
        aria-live="polite" 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
              t.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
                : t.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-900/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-[#7847CB]" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-xs font-bold leading-snug">{t.title}</h4>}
              <p className="text-xs font-medium leading-relaxed opacity-90 break-words">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* CUSTOM CONFIRM DIALOG */}
      {confirmState?.isOpen && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden transform transition-all animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.options.isDestructive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-purple-100 text-[#7847CB]'
                }`}
              >
                {confirmState.options.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
                  {confirmState.options.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
                  confirmState.options.isDestructive || confirmState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-[#7847CB] hover:bg-[#6336b3] shadow-[#7847CB]/20'
                }`}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PROMPT DIALOG */}
      {promptState?.isOpen && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-dialog-title"
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden transform transition-all animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 id="prompt-dialog-title" className="text-base font-bold text-slate-900">
                {promptState.options.title}
              </h3>
              <button
                onClick={handlePromptCancel}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePromptSubmit}>
              <p className="text-xs text-slate-600 mb-3 whitespace-pre-line">
                {promptState.options.message}
              </p>

              {promptState.options.inputType === 'textarea' ? (
                <textarea
                  ref={promptInputRef as any}
                  rows={3}
                  value={promptState.value}
                  onChange={(e) => setPromptState((p) => p ? { ...p, value: e.target.value, error: '' } : null)}
                  placeholder={promptState.options.placeholder}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
                />
              ) : (
                <input
                  ref={promptInputRef as any}
                  type={promptState.options.inputType || 'text'}
                  value={promptState.value}
                  onChange={(e) => setPromptState((p) => p ? { ...p, value: e.target.value, error: '' } : null)}
                  placeholder={promptState.options.placeholder}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
                />
              )}

              {promptState.error && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {promptState.error}
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePromptCancel}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {promptState.options.cancelText || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7847CB] hover:bg-[#6336b3] rounded-xl shadow-sm shadow-[#7847CB]/20 transition-all active:scale-95"
                >
                  {promptState.options.confirmText || 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

export const useToast = () => {
  const { toast } = useFeedback();
  return toast;
};

export const useConfirm = () => {
  const { confirm } = useFeedback();
  return confirm;
};

export const usePrompt = () => {
  const { prompt } = useFeedback();
  return prompt;
};
