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
  id: 'trip-drv-8492',
  busNumber: 'AH-24',
  routeNumber: '12',
  routeName: 'Central Bus Stand ↔ Savedi Terminal',
  origin: 'Central Bus Stand',
  destination: 'Savedi Terminal',
  shiftTiming: '06:00 AM – 02:00 PM',
  currentStopName: 'New Arts College',
  nextStopName: 'Savedi Road',
  etaMinutes: 4,
  status: 'In Progress',
  delayMinutes: 0,
  stops: [
    { name: 'Central Bus Stand (CBS)', scheduledTime: '08:00 AM', actualTime: '08:00 AM', status: 'passed' },
    { name: 'Railway Station Chowk', scheduledTime: '08:08 AM', actualTime: '08:07 AM', status: 'passed' },
    { name: 'New Arts College', scheduledTime: '08:16 AM', actualTime: '08:16 AM', status: 'passed' },
    { name: 'Savedi Road', scheduledTime: '08:24 AM', status: 'current' },
    { name: 'Premdan Hotel', scheduledTime: '08:30 AM', status: 'upcoming' },
    { name: 'Savedi Terminal', scheduledTime: '08:38 AM', status: 'upcoming' },
  ],
};

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'schedule' | 'route' | 'dispatch' | 'emergency';
}

export const MOCK_DRIVER_NOTIFICATIONS: DriverNotification[] = [
  {
    id: 'dn-1',
    title: 'Dispatch Announcement',
    message: 'Road maintenance on Market Yard Road. Proceed via Pipeline Road detour on Trip 3.',
    time: '10 mins ago',
    type: 'route',
  },
  {
    id: 'dn-2',
    title: 'Shift Confirmation',
    message: 'Your shift for tomorrow Aug 21 is confirmed: 06:00 AM – 02:00 PM (Bus AH-24).',
    time: '2 hours ago',
    type: 'schedule',
  },
  {
    id: 'dn-3',
    title: 'Emergency Advisory',
    message: 'Heavy rain warning issued for MIDC Industrial Zone. Maintain reduced speed (Max 35 km/h).',
    time: 'Yesterday',
    type: 'emergency',
  },
];
