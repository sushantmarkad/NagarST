export interface AdminKPIs {
  totalBuses: number;
  activeBuses: number;
  offlineBuses: number;
  maintenanceBuses: number;
  breakdownBuses: number;
  driversOnDuty: number;
  conductorsOnDuty: number;
  activeTrips: number;
  completedTrips: number;
  todayPassengers: number;
  todayTickets: number;
  todayRevenue: number;
  onTimePercentage: number;
}

export const MOCK_ADMIN_KPIS: AdminKPIs = {
  totalBuses: 0,
  activeBuses: 0,
  offlineBuses: 0,
  maintenanceBuses: 0,
  breakdownBuses: 0,
  driversOnDuty: 0,
  conductorsOnDuty: 0,
  activeTrips: 0,
  completedTrips: 0,
  todayPassengers: 0,
  todayTickets: 0,
  todayRevenue: 0,
  onTimePercentage: 100,
};

export interface AIInsight {
  id: string;
  category: 'Demand Prediction' | 'Delay Detection' | 'Maintenance Risk';
  title: string;
  description: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
  routeOrBus: string;
  timestamp: string;
}

export const MOCK_AI_INSIGHTS: AIInsight[] = [];

export interface IncidentReport {
  id: string;
  type: 'Breakdown' | 'Accident' | 'Road Block' | 'Dispute' | 'Medical' | 'Complaint';
  busNumber: string;
  routeNumber: string;
  location: string;
  reportedBy: string;
  reportedTime: string;
  status: 'New' | 'Assigned' | 'Investigating' | 'Resolved';
  description: string;
}

export const MOCK_INCIDENTS: IncidentReport[] = [];

export interface HourlyHourlyData {
  hour: string;
  passengers: number;
  tickets: number;
  revenue: number;
}

export const HOURLY_PASSENGER_DATA: HourlyHourlyData[] = [];
