export interface ConductorTripStats {
  ticketsSold: number;
  passengerCount: number;
  maxCapacity: number;
  cashCollection: number;
  digitalCollection: number;
  passHoldersCount: number;
  refundsCount: number;
  totalCollection: number;
}

export const INITIAL_CONDUCTOR_STATS: ConductorTripStats = {
  ticketsSold: 32,
  passengerCount: 47,
  maxCapacity: 60,
  cashCollection: 420,
  digitalCollection: 220,
  passHoldersCount: 15,
  refundsCount: 0,
  totalCollection: 640,
};

export interface TicketLog {
  id: string;
  source: string;
  destination: string;
  count: number;
  passengerType: string;
  fare: number;
  paymentMethod: 'Cash' | 'UPI / QR';
  time: string;
}

export const MOCK_TICKET_LOGS: TicketLog[] = [
  {
    id: 'TKT-901',
    source: 'Central Bus Stand',
    destination: 'Savedi Terminal',
    count: 2,
    passengerType: 'Adult',
    fare: 40,
    paymentMethod: 'UPI / QR',
    time: '08:18 AM',
  },
  {
    id: 'TKT-900',
    source: 'Railway Station Chowk',
    destination: 'New Arts College',
    count: 1,
    passengerType: 'Student',
    fare: 10,
    paymentMethod: 'Cash',
    time: '08:10 AM',
  },
  {
    id: 'TKT-899',
    source: 'Central Bus Stand',
    destination: 'Savedi Road',
    count: 1,
    passengerType: 'Senior Citizen',
    fare: 15,
    paymentMethod: 'Cash',
    time: '08:02 AM',
  },
];
