export interface DriverTrip {
  id: string;
  busNumber: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  shiftTiming: string;
  currentStopName: string;
  nextStopName: string;
  etaMinutes: number;
  status: 'Not Started' | 'In Progress' | 'On Time' | 'Delayed' | 'Completed';
  delayMinutes: number;
  stops: {
    name: string;
    scheduledTime: string;
    actualTime?: string;
    status: 'passed' | 'current' | 'upcoming';
  }[];
}

export const INITIAL_DRIVER_TRIP: DriverTrip = {
  id: '',
  busNumber: '',
  routeNumber: '',
  routeName: 'No active trip assigned',
  origin: '',
  destination: '',
  shiftTiming: '',
  currentStopName: '',
  nextStopName: '',
  etaMinutes: 0,
  status: 'Not Started',
  delayMinutes: 0,
  stops: [],
};

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'schedule' | 'route' | 'dispatch' | 'emergency';
}

export const MOCK_DRIVER_NOTIFICATIONS: DriverNotification[] = [];
