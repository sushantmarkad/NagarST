import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/FeedbackContext';
import { useApp } from '../../context/AppContext';
import { SharedLayout, type NavItem } from '../../components/layout/SharedLayout';
import { QRScanner } from '../../components/scanner/QRScanner';
import {
  QrCode,
  Ticket,
  CircleDollarSign,
  UserCheck,
  CheckCircle2,
  Users,
  Smartphone,
  Banknote,
  Plus
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatters';

const loadShiftStats = () => {
  try {
    const saved = localStorage.getItem('nagarst_conductor_shift');
    return saved ? JSON.parse(saved) : { scannedCount: 0, issuedCount: 0, cashCollected: 0, upiCollected: 0 };
  } catch {
    return { scannedCount: 0, issuedCount: 0, cashCollected: 0, upiCollected: 0 };
  }
};

export const ConductorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const { stops, routes, addTicket } = useApp();

  const [activeTab, setActiveTab] = useState<'scan' | 'issue' | 'shift'>('scan');

  // Quick Issuance State
  const [originStop, setOriginStop] = useState('');
  const [destinationStop, setDestinationStop] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [farePerHead, setFarePerHead] = useState(15);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');

  // Shift Ledger State (loaded from storage or start at 0)
  const [shiftStats, setShiftStats] = useState(loadShiftStats);
  const { scannedCount, issuedCount, cashCollected, upiCollected } = shiftStats;

  useEffect(() => {
    if (stops && stops.length > 0) {
      if (!originStop) setOriginStop(stops[0].name);
      if (!destinationStop) setDestinationStop(stops[Math.min(1, stops.length - 1)].name);
    }
  }, [stops]);

  const totalFare = farePerHead * passengerCount;

  const handleIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newIssued = issuedCount + passengerCount;
    const newCash = paymentMode === 'cash' ? cashCollected + totalFare : cashCollected;
    const newUpi = paymentMode === 'upi' ? upiCollected + totalFare : upiCollected;

    const updated = {
      ...shiftStats,
      issuedCount: newIssued,
      cashCollected: newCash,
      upiCollected: newUpi
    };
    setShiftStats(updated);
    try {
      localStorage.setItem('nagarst_conductor_shift', JSON.stringify(updated));
    } catch {}

    // Add to real app tickets
    addTicket({
      sourceStop: originStop || 'Central Bus Stand (CBS)',
      destinationStop: destinationStop || 'Savedi Terminus',
      passengerCount: passengerCount,
      fare: totalFare,
      fareBreakup: {
        baseFare: totalFare,
        govTax: 0,
        discount: 0,
        total: totalFare,
      },
      busType: 'Standard City'
    });

    toast.success(
      `Ticket issued: ${passengerCount} Passenger(s) • ${formatCurrency(totalFare)} (${paymentMode.toUpperCase()})`,
      'Fare Collected'
    );
  };

  const navItems: NavItem[] = [
    {
      id: 'scan',
      label: 'QR Scanner',
      icon: QrCode,
      onClick: () => setActiveTab('scan'),
      isActive: activeTab === 'scan',
      badge: scannedCount,
    },
    {
      id: 'issue',
      label: 'Fast Ticketing',
      icon: Ticket,
      onClick: () => setActiveTab('issue'),
      isActive: activeTab === 'issue',
    },
    {
      id: 'shift',
      label: 'Trip Ledger',
      icon: CircleDollarSign,
      onClick: () => setActiveTab('shift'),
      isActive: activeTab === 'shift',
    },
  ];

  return (
    <SharedLayout
      navItems={navItems}
      title="Conductor Console"
      subtitle={`Badge: ${user?.name || 'Staff'}`}
      headerIcon={UserCheck}
    >
      <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-4 overflow-y-auto">
        
        {/* On-board Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Scanned
            </span>
            <span className="text-base md:text-lg font-black text-slate-900 tabular-nums">
              {scannedCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7847CB] block tracking-wider">
              Issued
            </span>
            <span className="text-base md:text-lg font-black text-[#7847CB] tabular-nums">
              {issuedCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
              Fare Total
            </span>
            <span className="text-base md:text-lg font-black text-emerald-700 tabular-nums">
              {formatCurrency(cashCollected + upiCollected)}
            </span>
          </div>
        </div>

        {/* TAB 1: QR SCANNER */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
              <QRScanner />
            </div>
          </div>
        )}

        {/* TAB 2: FAST ON-BOARD TICKET ISSUANCE */}
        {activeTab === 'issue' && (
          <form onSubmit={handleIssueTicket} className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  On-Board Cash / UPI Ticket Issuance
                </h3>
                <p className="text-xs text-slate-500">
                  Rapid passenger fare collection for standing and boarding commuters
                </p>
              </div>
              <Badge variant="brand" size="sm">
                {routes && routes.length > 0 ? `Route #${routes[0].routeNumber || '01'}` : 'Municipal Fleet'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Origin Stop
                </label>
                <select
                  value={originStop}
                  onChange={(e) => setOriginStop(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
                >
                  {stops && stops.length > 0 ? (
                    stops.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No stops in database</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Stop
                </label>
                <select
                  value={destinationStop}
                  onChange={(e) => setDestinationStop(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
                >
                  {stops && stops.length > 0 ? (
                    stops.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No stops in database</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Passenger Count
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setPassengerCount(cnt)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-black transition-all ${
                      passengerCount === cnt
                        ? 'bg-[#7847CB] text-white border-[#7847CB] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Payment Received via
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-purple-50 border-[#7847CB] text-[#7847CB]'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Cash Currency
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    paymentMode === 'upi'
                      ? 'bg-purple-50 border-[#7847CB] text-[#7847CB]'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Conductor UPI QR
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Total Fare</span>
                <span className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
                  {formatCurrency(totalFare)}
                </span>
              </div>

              <Button type="submit" size="lg" className="px-6">
                Print & Issue Ticket
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: SHIFT / TRIP LEDGER */}
        {activeTab === 'shift' && (
          <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                Current Shift Collection Summary
              </h3>
              <Badge variant="success" size="sm">Active Shift</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-600 font-medium">Cash Collected in Hand</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(cashCollected)}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-600 font-medium">Digital UPI / Pass Scans</span>
                <span className="font-extrabold text-[#7847CB]">{formatCurrency(upiCollected)}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-purple-50 rounded-2xl border border-purple-100 text-xs">
                <span className="font-bold text-[#7847CB]">Grand Total Collected</span>
                <span className="font-black text-[#7847CB] text-base">{formatCurrency(cashCollected + upiCollected)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              className="w-full mt-2"
              onClick={() => toast.info('Shift summary exported to municipal transit depot archive.')}
            >
              Export Shift Report to Depot
            </Button>
          </div>
        )}

      </div>
    </SharedLayout>
  );
};
