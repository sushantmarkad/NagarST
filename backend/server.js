const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// =========================================================================
// DATA SEPARATION: Production vs Demo In-Memory Stores
// =========================================================================
// 1. Production driver GPS store (strictly production trips only)
const activeBuses = new Map();

// 2. Dedicated demo simulator store (completely segregated from live GPS data)
const demoBuses = new Map();

// =========================================================================
// PREDEFINED ROAD ROUTE COORDINATES (Ahilyanagar Corridor: Delhi Gate -> Dairy Chowk)
// =========================================================================
const DEMO_ROUTE_STOPS = [
  { id: 'stop-dg', name: 'Delhi Gate Terminal', lat: 19.109728, lng: 74.733295, km: 0 },
  { id: 'stop-my', name: 'Market Yard Hub', lat: 19.121543, lng: 74.727673, km: 2.1 },
  { id: 'stop-sv', name: 'Savedi Phata', lat: 19.135622, lng: 74.721761, km: 4.3 },
  { id: 'stop-pc', name: 'Premdan Chowk', lat: 19.145418, lng: 74.711820, km: 6.2 },
  { id: 'stop-pr', name: 'Pipeline Road Cross', lat: 19.157221, lng: 74.704662, km: 8.4 },
  { id: 'stop-dc', name: 'Dairy Chowk Terminal', lat: 19.170628, lng: 74.697225, km: 10.8 }
];

// High-fidelity road coordinates following State Highway 10 in Ahilyanagar
const DEMO_ROAD_WAYPOINTS = [
  { lat: 19.109728, lng: 74.733295 },
  { lat: 19.111240, lng: 74.732810 },
  { lat: 19.112850, lng: 74.732200 },
  { lat: 19.114310, lng: 74.731550 },
  { lat: 19.115820, lng: 74.730820 },
  { lat: 19.117450, lng: 74.729980 },
  { lat: 19.119100, lng: 74.729050 },
  { lat: 19.120480, lng: 74.728250 },
  { lat: 19.121543, lng: 74.727673 }, // Stop: Market Yard
  { lat: 19.122530, lng: 74.727390 },
  { lat: 19.123649, lng: 74.727096 },
  { lat: 19.124992, lng: 74.726708 },
  { lat: 19.126313, lng: 74.726201 },
  { lat: 19.127429, lng: 74.725691 },
  { lat: 19.129957, lng: 74.724445 },
  { lat: 19.131650, lng: 74.723602 },
  { lat: 19.133514, lng: 74.722740 },
  { lat: 19.135622, lng: 74.721761 }, // Stop: Savedi Phata
  { lat: 19.137066, lng: 74.721085 },
  { lat: 19.138381, lng: 74.720221 },
  { lat: 19.139442, lng: 74.718728 },
  { lat: 19.139850, lng: 74.716115 },
  { lat: 19.141134, lng: 74.714988 },
  { lat: 19.142972, lng: 74.713693 },
  { lat: 19.144449, lng: 74.712558 },
  { lat: 19.145418, lng: 74.711820 }, // Stop: Premdan Chowk
  { lat: 19.146586, lng: 74.710983 },
  { lat: 19.148096, lng: 74.710042 },
  { lat: 19.150156, lng: 74.708773 },
  { lat: 19.152754, lng: 74.707187 },
  { lat: 19.155356, lng: 74.705678 },
  { lat: 19.157221, lng: 74.704662 }, // Stop: Pipeline Road
  { lat: 19.159640, lng: 74.703365 },
  { lat: 19.161970, lng: 74.702099 },
  { lat: 19.163942, lng: 74.700925 },
  { lat: 19.165847, lng: 74.699779 },
  { lat: 19.167748, lng: 74.698645 },
  { lat: 19.169497, lng: 74.697686 },
  { lat: 19.170628, lng: 74.697225 }  // Stop: Dairy Chowk
];

// Helper: Haversine distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: Compass heading
function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
            Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// =========================================================================
// MULTI-BUS SIMULATOR ENGINE (Server-Side)
// =========================================================================
const DEMO_FLEET_CONFIG = [
  {
    id: 'demo-bus-sim-01',
    busNumber: 'MH-16-DEMO-1',
    plateNumber: 'MH-16-DM-101',
    routeId: 'route-12',
    routeNumber: 'Route 12',
    routeName: 'Delhi Gate ↔ Dairy Chowk (Pipeline Rd)',
    origin: 'Delhi Gate Terminal',
    destination: 'Dairy Chowk Terminal',
    stops: DEMO_ROUTE_STOPS,
    waypoints: DEMO_ROAD_WAYPOINTS,
    currentIndex: 0,
    direction: 1
  },
  {
    id: 'demo-bus-sim-02',
    busNumber: 'MH-16-DEMO-2',
    plateNumber: 'MH-16-DM-102',
    routeId: 'route-1',
    routeNumber: 'Route 1',
    routeName: 'CBS ↔ MIDC Nagapur Sector 1',
    origin: 'Central Bus Stand (CBS)',
    destination: 'MIDC Nagapur Sector 1',
    stops: [
      { id: 'stop-cbs', name: 'Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420 },
      { id: 'stop-swastik', name: 'Swastik Chowk Hub', lat: 19.0952, lng: 74.7496 },
      { id: 'stop-delhi-gate', name: 'Delhi Gate Circle', lat: 19.1020, lng: 74.7480 },
      { id: 'stop-premdan', name: 'Premdan Chowk', lat: 19.1130, lng: 74.7390 },
      { id: 'stop-savedi', name: 'Savedi Terminal', lat: 19.1220, lng: 74.7350 },
      { id: 'stop-midc', name: 'MIDC Nagapur Sector 1', lat: 19.1550, lng: 74.7180 }
    ],
    waypoints: [
      { lat: 19.0975, lng: 74.7420 },
      { lat: 19.0971, lng: 74.7441 },
      { lat: 19.0963, lng: 74.7468 },
      { lat: 19.0952, lng: 74.7496 },
      { lat: 19.0970, lng: 74.7492 },
      { lat: 19.0991, lng: 74.7487 },
      { lat: 19.1020, lng: 74.7480 },
      { lat: 19.1042, lng: 74.7458 },
      { lat: 19.1068, lng: 74.7436 },
      { lat: 19.1095, lng: 74.7412 },
      { lat: 19.1130, lng: 74.7390 },
      { lat: 19.1158, lng: 74.7378 },
      { lat: 19.1189, lng: 74.7364 },
      { lat: 19.1220, lng: 74.7350 },
      { lat: 19.1265, lng: 74.7328 },
      { lat: 19.1310, lng: 74.7302 },
      { lat: 19.1360, lng: 74.7275 },
      { lat: 19.1415, lng: 74.7248 },
      { lat: 19.1470, lng: 74.7220 },
      { lat: 19.1510, lng: 74.7200 },
      { lat: 19.1550, lng: 74.7180 }
    ],
    currentIndex: 4,
    direction: 1
  },
  {
    id: 'demo-bus-sim-03',
    busNumber: 'MH-16-DEMO-3',
    plateNumber: 'MH-16-DM-103',
    routeId: 'route-4',
    routeNumber: 'Route 4',
    routeName: 'Savedi Terminal ↔ Central Railway Station',
    origin: 'Savedi Bus Terminal',
    destination: 'Central Railway Station',
    stops: [
      { id: 'stop-savedi', name: 'Savedi Bus Terminal', lat: 19.1220, lng: 74.7350 },
      { id: 'stop-premdan', name: 'Premdan Chowk', lat: 19.1130, lng: 74.7390 },
      { id: 'stop-wadia', name: 'Wadia Park Stadium', lat: 19.0980, lng: 74.7450 },
      { id: 'stop-cbs', name: 'Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420 },
      { id: 'stop-railway', name: 'Central Railway Station', lat: 19.0810, lng: 74.7380 }
    ],
    waypoints: [
      { lat: 19.1220, lng: 74.7350 },
      { lat: 19.1192, lng: 74.7364 },
      { lat: 19.1161, lng: 74.7377 },
      { lat: 19.1130, lng: 74.7390 },
      { lat: 19.1090, lng: 74.7408 },
      { lat: 19.1052, lng: 74.7425 },
      { lat: 19.1018, lng: 74.7441 },
      { lat: 19.0980, lng: 74.7450 },
      { lat: 19.0977, lng: 74.7435 },
      { lat: 19.0975, lng: 74.7420 },
      { lat: 19.0945, lng: 74.7412 },
      { lat: 19.0912, lng: 74.7404 },
      { lat: 19.0878, lng: 74.7395 },
      { lat: 19.0845, lng: 74.7388 },
      { lat: 19.0810, lng: 74.7380 }
    ],
    currentIndex: 2,
    direction: 1
  }
];

let demoInterval = null;
let demoState = {
  isRunning: false,
  speedMultiplier: 1,
  delayMinutes: 0,
  activeBusCount: 0
};

function tickDemoSimulator() {
  if (!demoState.isRunning) return;

  DEMO_FLEET_CONFIG.forEach(busConfig => {
    const waypoints = busConfig.waypoints;
    let nextIdx = busConfig.currentIndex + busConfig.direction;
    if (nextIdx >= waypoints.length) {
      busConfig.direction = -1;
      nextIdx = waypoints.length - 2;
    } else if (nextIdx < 0) {
      busConfig.direction = 1;
      nextIdx = 1;
    }
    busConfig.currentIndex = Math.max(0, Math.min(waypoints.length - 1, nextIdx));

    const currentPt = waypoints[busConfig.currentIndex];
    const lookaheadIdx = (busConfig.currentIndex + busConfig.direction + waypoints.length) % waypoints.length;
    const nextPt = waypoints[lookaheadIdx];

    const heading = Math.round(calculateBearing(currentPt.lat, currentPt.lng, nextPt.lat, nextPt.lng));
    const baseSpeed = 28 + Math.floor(Math.sin(busConfig.currentIndex) * 7);
    const currentSpeed = Math.max(16, baseSpeed);

    const progressRatio = busConfig.currentIndex / (waypoints.length - 1);
    const stopIndex = Math.min(
      busConfig.stops.length - 2,
      Math.max(0, Math.floor(progressRatio * (busConfig.stops.length - 1)))
    );

    const curStop = busConfig.stops[stopIndex];
    const nextStop = busConfig.stops[stopIndex + 1] || busConfig.stops[busConfig.stops.length - 1];

    const distToNextStop = calculateDistance(currentPt.lat, currentPt.lng, nextStop.lat, nextStop.lng);
    const nominalMinutes = Math.max(1, Math.round((distToNextStop / 1000) / (currentSpeed / 60)));
    const etaMinutes = nominalMinutes + (demoState.delayMinutes || 0);
    const status = demoState.delayMinutes > 3 ? 'delayed' : 'on_time';

    const telemetryPayload = {
      id: busConfig.id,
      busId: busConfig.id,
      busNumber: busConfig.busNumber,
      plateNumber: busConfig.plateNumber,
      routeId: busConfig.routeId,
      routeNumber: `${busConfig.routeNumber} (DEMO)`,
      routeName: `${busConfig.routeName} [DEMO]`,
      origin: busConfig.origin,
      destination: busConfig.destination,
      currentStopId: curStop.id,
      currentStopName: curStop.name,
      nextStopId: nextStop.id,
      nextStopName: nextStop.name,
      etaToNextMinutes: etaMinutes,
      delayMinutes: demoState.delayMinutes,
      speedKmh: currentSpeed,
      occupancy: 'moderate',
      status: status,
      lat: currentPt.lat,
      lng: currentPt.lng,
      heading: heading,
      driverName: `Demo Pilot (${busConfig.busNumber})`,
      conductorName: 'Simulated Crew',
      busType: 'EV Metro Shuttle',
      isDemo: true,
      lastUpdated: new Date().toISOString()
    };

    demoBuses.set(busConfig.id, telemetryPayload);

    io.emit('locationUpdate', telemetryPayload);
    io.to('demo-tracking').emit('demoLocationUpdate', telemetryPayload);
  });
}

function startDemoSimulator(options = {}) {
  const speedMult = Math.min(10, Math.max(1, options.speedMultiplier || 1));
  const delay = Math.max(0, options.delayMinutes || 0);

  demoState.isRunning = true;
  demoState.speedMultiplier = speedMult;
  demoState.delayMinutes = delay;
  demoState.activeBusCount = DEMO_FLEET_CONFIG.length;

  if (demoInterval) clearInterval(demoInterval);

  const intervalMs = Math.max(250, Math.round(1400 / speedMult));
  demoInterval = setInterval(tickDemoSimulator, intervalMs);

  tickDemoSimulator();

  io.emit('demoStatus', { isRunning: true, ...demoState });
  return { success: true, message: 'Multi-bus Demo Simulator started', state: demoState };
}

function stopDemoSimulator() {
  demoState.isRunning = false;
  demoState.activeBusCount = 0;
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  DEMO_FLEET_CONFIG.forEach(b => {
    demoBuses.delete(b.id);
    io.emit('busOffline', b.id);
  });

  io.to('demo-tracking').emit('demoStopped', { all: true });
  io.emit('demoStatus', { isRunning: false, ...demoState });

  return { success: true, message: 'All Demo Buses stopped' };
}

// =========================================================================
// SOCKET.IO EVENT HANDLERS
// =========================================================================
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current active production buses + demo buses to newly connected clients
  const allInitial = [...Array.from(activeBuses.values()), ...Array.from(demoBuses.values())];
  socket.emit('initialLocations', allInitial);
  socket.emit('demoStatus', { isRunning: demoState.isRunning, ...demoState });

  // Allow clients to join the dedicated demo room
  socket.on('joinDemoRoom', () => {
    socket.join('demo-tracking');
    demoBuses.forEach((bus) => {
      socket.emit('demoLocationUpdate', bus);
    });
  });

  // PRODUCTION GPS LOCATION UPDATES (from real mobile drivers)
  socket.on('updateLocation', (data) => {
    if (!data || !data.busId) return;

    // Prevent simulated or demo data from ever writing to activeBuses
    if (data.isDemo || String(data.busId).startsWith('demo-') || String(data.id).startsWith('demo-')) {
      demoBuses.set(data.busId, { ...data, isDemo: true });
      io.emit('locationUpdate', { ...data, isDemo: true });
      io.to('demo-tracking').emit('demoLocationUpdate', { ...data, isDemo: true });
      return;
    }

    // Normal production driver telemetry
    activeBuses.set(data.busId, data);
    io.emit('locationUpdate', data);
  });

  // PRODUCTION BUS OFFLINE
  socket.on('stopTrip', (busId) => {
    if (String(busId).startsWith('demo-')) {
      demoBuses.delete(busId);
      io.emit('busOffline', busId);
    } else {
      activeBuses.delete(busId);
      io.emit('busOffline', busId);
    }
  });

  // DEMO CONTROLS (Socket-based)
  socket.on('startDemo', (params) => {
    console.log('Received startDemo request:', params);
    startDemoSimulator(params);
  });

  socket.on('stopDemo', () => {
    console.log('Received stopDemo request');
    stopDemoSimulator();
  });

  socket.on('setDemoSpeed', (data) => {
    if (demoState.isRunning) {
      startDemoSimulator({ speedMultiplier: data?.speedMultiplier || 1, delayMinutes: demoState.delayMinutes });
    } else {
      demoState.speedMultiplier = data?.speedMultiplier || 1;
      io.emit('demoStatus', demoState);
    }
  });

  socket.on('setDemoDelay', (data) => {
    demoState.delayMinutes = data?.delayMinutes || 0;
    io.emit('demoStatus', demoState);
  });

  // DISPATCH
  socket.on('sendDispatchMessage', (data) => {
    io.emit('dispatchMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// =========================================================================
// REST API ENDPOINTS FOR DEMO CONTROLS (with Role Authorization)
// =========================================================================

// Middleware for demo control authorization
const requireDemoAuth = (req, res, next) => {
  const role = req.headers['x-user-role'];
  const allowed = ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'];
  if (!role || !allowed.includes(role)) {
    return res.status(403).json({ error: 'Unauthorized: Demo controls restricted to administrative personnel.' });
  }
  next();
};

app.get('/api/demo/status', (req, res) => {
  res.json({
    isRunning: demoState.isRunning,
    state: demoState,
    stops: DEMO_ROUTE_STOPS,
    totalWaypoints: DEMO_ROAD_WAYPOINTS.length
  });
});

app.post('/api/demo/start', requireDemoAuth, (req, res) => {
  const { speedMultiplier = 1, delayMinutes = 0 } = req.body || {};
  const result = startDemoSimulator({ speedMultiplier, delayMinutes });
  res.json(result);
});

app.post('/api/demo/stop', requireDemoAuth, (req, res) => {
  const result = stopDemoSimulator();
  res.json(result);
});

app.post('/api/demo/speed', requireDemoAuth, (req, res) => {
  const { speedMultiplier = 1 } = req.body || {};
  if (demoState.isRunning) {
    startDemoSimulator({ speedMultiplier, delayMinutes: demoState.delayMinutes });
  } else {
    demoState.speedMultiplier = speedMultiplier;
  }
  res.json({ success: true, speedMultiplier: demoState.speedMultiplier });
});

app.post('/api/demo/delay', requireDemoAuth, (req, res) => {
  const { delayMinutes = 0 } = req.body || {};
  demoState.delayMinutes = delayMinutes;
  res.json({ success: true, delayMinutes: demoState.delayMinutes });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO & Demo Simulator Server running on port ${PORT}`);
});
