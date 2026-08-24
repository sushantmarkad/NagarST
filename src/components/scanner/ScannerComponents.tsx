import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Ticket as TicketIcon
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export type ScannerMode = 'ticket' | 'pass';

export interface ScannerModeSelectorProps {
  mode: ScannerMode;
  onSelectMode: (mode: ScannerMode) => void;
}

export const ScannerModeSelector: React.FC<ScannerModeSelectorProps> = ({ mode, onSelectMode }) => {
  return (
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mb-4">
      <button
        type="button"
        onClick={() => onSelectMode('ticket')}
        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
          mode === 'ticket'
            ? 'bg-[#0f3c5c] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <TicketIcon className="w-4 h-4" /> Single Ticket
      </button>

      <button
        type="button"
        onClick={() => onSelectMode('pass')}
        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
          mode === 'pass'
            ? 'bg-[#0f3c5c] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <CreditCard className="w-4 h-4" /> Bus Pass
      </button>
    </div>
  );
};

export interface VerificationResultData {
  status: 'valid' | 'invalid' | 'expired' | 'already_used';
  passengerName: string;
  route?: string;
  ticketType?: string;
  fare?: number;
  validUntil?: string;
  expiredAt?: string;
  previousValidationTime?: string;
  ticketId?: string;
  reason?: string;
  passType?: string;
  validFrom?: string;
  passStatus?: string;
}

export interface TicketVerificationResultProps {
  data: VerificationResultData;
  onScanAnother: () => void;
}

export const TicketVerificationResult: React.FC<TicketVerificationResultProps> = ({ data, onScanAnother }) => {
  if (data.status === 'valid') {
    return (
      <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200 uppercase tracking-wider">
          ✓ Valid Ticket
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Passenger:</span>
            <span className="font-extrabold text-slate-900">{data.passengerName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Route:</span>
            <span className="font-bold text-[#0f3c5c]">{data.route || 'Central Bus Stand → Savedi'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Ticket Type:</span>
            <span className="font-medium text-slate-700">{data.ticketType || 'Single Journey'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Fare:</span>
            <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(data.fare || 20)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valid Until:</span>
            <span className="font-bold text-slate-900">{data.validUntil || '10:45 AM'}</span>
          </div>
        </div>

        <button
          onClick={onScanAnother}
          className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
        >
          Done & Scan Another
        </button>
      </div>
    );
  }

  if (data.status === 'expired') {
    return (
      <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
          <AlertTriangle className="w-8 h-8 stroke-[2]" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200 uppercase tracking-wider">
          ⚠ Ticket Expired
        </div>
        <p className="text-xs text-slate-600">This ticket expired at {data.expiredAt || '10:45 AM'}</p>

        <button
          onClick={onScanAnother}
          className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
        >
          Scan Again
        </button>
      </div>
    );
  }

  if (data.status === 'already_used') {
    return (
      <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 mx-auto flex items-center justify-center border border-rose-200">
          <XCircle className="w-8 h-8 stroke-[2]" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-extrabold border border-rose-200 uppercase tracking-wider">
          ✕ Ticket Already Used
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Previous Scan:</span>
            <span className="font-semibold text-rose-700">{data.previousValidationTime || 'Today, 08:12 AM'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ticket ID:</span>
            <span className="font-mono text-slate-700">{data.ticketId || 'ANC-TKT-8492'}</span>
          </div>
        </div>

        <button
          onClick={onScanAnother}
          className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
        >
          Scan Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 mx-auto flex items-center justify-center border border-rose-200">
        <XCircle className="w-8 h-8 stroke-[2]" />
      </div>
      <div className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-extrabold border border-rose-200 uppercase tracking-wider">
        ✕ Invalid Ticket
      </div>
      <p className="text-xs text-slate-600">
        Reason: {data.reason || 'Invalid QR code signature or wrong route'}
      </p>

      <button
        onClick={onScanAnother}
        className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
      >
        Scan Again
      </button>
    </div>
  );
};

export interface PassVerificationResultProps {
  data: VerificationResultData;
  onScanAnother: () => void;
}

export const PassVerificationResult: React.FC<PassVerificationResultProps> = ({ data, onScanAnother }) => {
  if (data.status === 'valid') {
    return (
      <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-200 uppercase tracking-wider">
          ✓ Valid Bus Pass
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Passenger:</span>
            <span className="font-extrabold text-slate-900">{data.passengerName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Pass Type:</span>
            <span className="font-bold text-[#0f3c5c]">{data.passType || 'Monthly Student Pass'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Valid From:</span>
            <span className="font-medium text-slate-700">{data.validFrom || '01 Aug 2026'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Valid Until:</span>
            <span className="font-bold text-slate-900">{data.validUntil || '31 Aug 2026'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
              ACTIVE PASS
            </span>
          </div>
        </div>

        <button
          onClick={onScanAnother}
          className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
        >
          Scan Another Pass
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 mx-auto flex items-center justify-center border border-rose-200">
        <XCircle className="w-8 h-8 stroke-[2]" />
      </div>
      <div className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-extrabold border border-rose-200 uppercase tracking-wider">
        ✕ Invalid Bus Pass
      </div>
      <p className="text-xs text-slate-600">
        Reason: {data.reason || 'Pass expired or identity verification failed'}
      </p>

      <button
        onClick={onScanAnother}
        className="w-full py-3 rounded-xl bg-[#0f3c5c] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs mt-2"
      >
        Scan Again
      </button>
    </div>
  );
};

export interface ManualCodeEntryProps {
  onSubmitCode: (code: string) => void;
}

export const ManualCodeEntry: React.FC<ManualCodeEntryProps> = ({ onSubmitCode }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmitCode(code.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs shadow-2xs">
      <label className="block font-bold text-slate-800">Enter Ticket / Pass Code Manually</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. ANC-2026-8492"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono uppercase focus:outline-none focus:border-[#0f3c5c]"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#0f3c5c] text-white font-bold rounded-xl hover:bg-[#0a2a42] transition shadow-2xs"
        >
          Verify
        </button>
      </div>
    </form>
  );
};
