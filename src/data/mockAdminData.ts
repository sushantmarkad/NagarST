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
  totalBuses: 48,
  activeBuses: 38,
  offlineBuses: 4,
  maintenanceBuses: 4,
  breakdownBuses: 2,
  driversOnDuty: 42,
  conductorsOnDuty: 40,
  activeTrips: 28,
  completedTrips: 112,
  todayPassengers: 14280,
  todayTickets: 11450,
  todayRevenue: 184500,
  onTimePercentage: 94.2,
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

export const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    id: 'ai-1',
    category: 'Demand Prediction',
    title: 'Peak Morning Surge Predicted on Route 12',
    description: 'Route 12 (CBS ↔ Savedi) is predicted to have 32% higher passenger demand tomorrow between 8:00 AM – 9:00 AM based on college schedule and weather patterns.',
    recommendation: 'Deploy 1 additional bus (AH-18) from Savedi Depot during 07:45 AM – 09:30 AM.',
    severity: 'high',
    routeOrBus: 'Route 12',
    timestamp: '15 mins ago',
  },
  {
    id: 'ai-2',
    category: 'Delay Detection',
    title: 'Recurrent Traffic Bottleneck at Market Yard Chowk',
    description: 'Route 7 average trip delay increased by 18% this week. Congestion peaks consistently between 08:15 AM – 09:00 AM.',
    recommendation: 'Temporarily reroute trips departing between 08:00 AM – 08:45 AM via Pipeline Road bypass.',
    severity: 'medium',
    routeOrBus: 'Route 7',
    timestamp: '1 hour ago',
  },
  {
    id: 'ai-3',
    category: 'Maintenance Risk',
    title: 'Engine Thermal Anomaly Detected on Bus AH-24',
    description: 'Bus AH-24 shows increased maintenance risk based on recent coolant temperature logs and brake vibration telemetry over 3 shifts.',
    recommendation: 'Schedule preventive maintenance inspection at Central Workshop tonight at 09:00 PM.',
    severity: 'high',
    routeOrBus: 'Bus AH-24',
    timestamp: '3 hours ago',
  },
];

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

export const MOCK_INCIDENTS: IncidentReport[] = [
  {
    id: 'INC-401',
    type: 'Breakdown',
    busNumber: 'AH-09',
    routeNumber: 'R-05',
    location: 'MIDC Phase II Gate',
    reportedBy: 'Driver S. Kamble',
    reportedTime: '07:42 AM',
    status: 'Investigating',
    description: 'Radiator hose leak reported. Passenger transfer initiated to backup Bus AH-14.',
  },
  {
    id: 'INC-402',
    type: 'Road Block',
    busNumber: 'AH-12',
    routeNumber: 'R-08',
    location: 'Delhi Gate Chowk',
    reportedBy: 'Control Room Ops',
    reportedTime: '08:15 AM',
    status: 'Assigned',
    description: 'Water pipeline repair work blocking main lane. Buses detoured via Swastik Chowk.',
  },
  {
    id: 'INC-403',
    type: 'Dispute',
    busNumber: 'AH-24',
    routeNumber: 'R-12',
    location: 'Savedi Road',
    reportedBy: 'Conductor A. Deshmukh',
    reportedTime: 'Yesterday, 04:30 PM',
    status: 'Resolved',
    description: 'Pass validity dispute resolved after verifying online pass database entry.',
  },
];

export interface HourlyHourlyData {
  hour: string;
  passengers: number;
  tickets: number;
  revenue: number;
}

export const HOURLY_PASSENGER_DATA: HourlyHourlyData[] = [
  { hour: '06:00 AM', passengers: 420, tickets: 350, revenue: 6300 },
  { hour: '07:00 AM', passengers: 980, tickets: 820, revenue: 14760 },
  { hour: '08:00 AM', passengers: 2150, tickets: 1840, revenue: 33120 },
  { hour: '09:00 AM', passengers: 2480, tickets: 2050, revenue: 36900 },
  { hour: '10:00 AM', passengers: 1720, tickets: 1410, revenue: 25380 },
  { hour: '11:00 AM', passengers: 1100, tickets: 890, revenue: 16020 },
  { hour: '12:00 PM', passengers: 950, tickets: 760, revenue: 13680 },
  { hour: '01:00 PM', passengers: 1050, tickets: 830, revenue: 14940 },
  { hour: '02:00 PM', passengers: 1380, tickets: 1120, revenue: 20160 },
  { hour: '03:00 PM', passengers: 1250, tickets: 1010, revenue: 18180 },
  { hour: '04:00 PM', passengers: 1890, tickets: 1540, revenue: 27720 },
  { hour: '05:00 PM', passengers: 2610, tickets: 2180, revenue: 39240 },
  { hour: '06:00 PM', passengers: 2420, tickets: 1980, revenue: 35640 },
  { hour: '07:00 PM', passengers: 1650, tickets: 1320, revenue: 23760 },
  { hour: '08:00 PM', passengers: 920, tickets: 740, revenue: 13320 },
];
