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
  ticketsSold: 0,
  passengerCount: 0,
  maxCapacity: 60,
  cashCollection: 0,
  digitalCollection: 0,
  passHoldersCount: 0,
  refundsCount: 0,
  totalCollection: 0,
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

export const MOCK_TICKET_LOGS: TicketLog[] = [];
