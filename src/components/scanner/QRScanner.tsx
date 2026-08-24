import React, { useState } from 'react';
import {
  ScannerModeSelector,
  TicketVerificationResult,
  PassVerificationResult,
  ManualCodeEntry,
  type ScannerMode,
  type VerificationResultData
} from './ScannerComponents';
import { Camera, QrCode } from 'lucide-react';

export const QRScanner: React.FC = () => {
  const [mode, setMode] = useState<ScannerMode>('ticket');
  const [result, setResult] = useState<VerificationResultData | null>(null);

  const verifyCode = (code: string, currentMode: ScannerMode): VerificationResultData => {
    const uppercaseCode = code.toUpperCase();

    if (currentMode === 'ticket') {
      if (uppercaseCode.includes('EXPIRED')) {
        return {
          status: 'expired',
          passengerName: 'Rahul Verma',
          expiredAt: '10:45 AM',
        };
      }
      if (uppercaseCode.includes('USED')) {
        return {
          status: 'already_used',
          passengerName: 'Sneha Kulkarni',
          previousValidationTime: 'Today, 08:12 AM',
          ticketId: 'ANC-TKT-9842',
        };
      }
      if (uppercaseCode.includes('INVALID') || uppercaseCode.length < 4) {
        return {
          status: 'invalid',
          passengerName: 'Unknown',
          reason: 'Invalid signature or expired route ticket',
        };
      }
      return {
        status: 'valid',
        passengerName: 'Chirag Tapre',
        route: 'Central Bus Stand → Savedi',
        ticketType: 'Single Journey',
        fare: 20,
        validUntil: '11:59 PM',
      };
    } else {
      if (uppercaseCode.includes('EXPIRED') || uppercaseCode.includes('INVALID')) {
        return {
          status: 'invalid',
          passengerName: 'Priyanjali Shinde',
          reason: 'Monthly pass expired on 15 Aug 2026',
        };
      }
      return {
        status: 'valid',
        passengerName: 'Pooja Deshmukh',
        passType: 'Monthly Student Pass',
        validFrom: '01 Aug 2026',
        validUntil: '31 Aug 2026',
        passStatus: 'Active',
      };
    }
  };

  const handleSimulateScan = (scenario: 'valid_ticket' | 'expired_ticket' | 'used_ticket' | 'invalid_ticket' | 'valid_pass' | 'invalid_pass') => {
    let mockResult: VerificationResultData;

    switch (scenario) {
      case 'valid_ticket':
        mockResult = verifyCode('VALID-TICKET', 'ticket');
        break;
      case 'expired_ticket':
        mockResult = verifyCode('EXPIRED-TICKET', 'ticket');
        break;
      case 'used_ticket':
        mockResult = verifyCode('USED-TICKET', 'ticket');
        break;
      case 'invalid_ticket':
        mockResult = verifyCode('INVALID-TICKET', 'ticket');
        break;
      case 'valid_pass':
        mockResult = verifyCode('VALID-PASS', 'pass');
        break;
      case 'invalid_pass':
        mockResult = verifyCode('INVALID-PASS', 'pass');
        break;
    }

    setResult(mockResult);
  };

  const handleManualCode = (code: string) => {
    const res = verifyCode(code, mode);
    setResult(res);
  };

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <div className="text-center">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5 text-[#0f3c5c]" /> Verify Passenger {mode === 'ticket' ? 'Ticket' : 'Bus Pass'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Scan passenger QR code via device camera</p>
      </div>

      <ScannerModeSelector
        mode={mode}
        onSelectMode={(newMode) => {
          setMode(newMode);
          setResult(null);
        }}
      />

      {result ? (
        mode === 'ticket' ? (
          <TicketVerificationResult data={result} onScanAnother={() => setResult(null)} />
        ) : (
          <PassVerificationResult data={result} onScanAnother={() => setResult(null)} />
        )
      ) : (
        <div className="space-y-4">
          {/* Camera Frame: Clean real-world transit style (NO neon / NO scifi) */}
          <div className="relative aspect-square w-full rounded-2xl bg-slate-100 border border-slate-300 overflow-hidden flex flex-col items-center justify-center shadow-inner">
            <div className="absolute inset-8 border-2 border-dashed border-[#0f3c5c]/40 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-[#0f3c5c]" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-[#0f3c5c]" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-[#0f3c5c]" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-[#0f3c5c]" />
              </div>
            </div>

            <div className="relative z-10 text-center p-4">
              <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Position QR inside the frame</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Automatic optical code validation</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Verification Test Simulator
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {mode === 'ticket' ? (
                  <>
                    <button
                      onClick={() => handleSimulateScan('valid_ticket')}
                      className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      ✓ Valid Ticket
                    </button>
                    <button
                      onClick={() => handleSimulateScan('expired_ticket')}
                      className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                    >
                      ⚠ Expired Ticket
                    </button>
                    <button
                      onClick={() => handleSimulateScan('used_ticket')}
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
                    >
                      ✕ Already Used
                    </button>
                    <button
                      onClick={() => handleSimulateScan('invalid_ticket')}
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
                    >
                      ✕ Invalid Ticket
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSimulateScan('valid_pass')}
                      className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                    >
                      ✓ Valid Pass
                    </button>
                    <button
                      onClick={() => handleSimulateScan('invalid_pass')}
                      className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
                    >
                      ✕ Expired / Invalid
                    </button>
                  </>
                )}
              </div>
            </div>

            <ManualCodeEntry onSubmitCode={handleManualCode} />
          </div>
        </div>
      )}
    </div>
  );
};
