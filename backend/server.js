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
// SIMULATOR ENGINE (Server-Side)
// =========================================================================
let demoInterval = null;
let demoState = {
  isRunning: false,
  currentIndex: 0,
  speedMultiplier: 1,
  delayMinutes: 0,
  busId: 'demo-bus-sim-01',
  busNumber: 'MH-16-DEMO',
  plateNumber: 'MH-16-DEMO-SIM',
  tripId: 'demo-trip-sim-001',
  routeNumber: 'MH-16 (DEMO)',
  routeName: 'Delhi Gate - Dairy Chowk (DEMO ROUTE)',
  currentStopName: 'Delhi Gate Terminal',
  nextStopName: 'Market Yard Hub',
  etaToNextMinutes: 4,
  speedKmh: 32,
  lat: DEMO_ROAD_WAYPOINTS[0].lat,
  lng: DEMO_ROAD_WAYPOINTS[0].lng,
  heading: 320,
  status: 'on_time'
};

function tickDemoSimulator() {
  if (!demoState.isRunning) return;

  const waypoints = DEMO_ROAD_WAYPOINTS;
  demoState.currentIndex = (demoState.currentIndex + 1) % waypoints.length;
  
  const currentPt = waypoints[demoState.currentIndex];
  const nextPt = waypoints[(demoState.currentIndex + 1) % waypoints.length];
  
  const heading = Math.round(calculateBearing(currentPt.lat, currentPt.lng, nextPt.lat, nextPt.lng));
  const baseSpeed = 30 + Math.floor(Math.sin(demoState.currentIndex) * 8);
  const currentSpeed = Math.max(15, baseSpeed);

  // Determine current and next stop
  const progressRatio = demoState.currentIndex / (waypoints.length - 1);
  const stopIndex = Math.min(
    DEMO_ROUTE_STOPS.length - 2,
    Math.floor(progressRatio * (DEMO_ROUTE_STOPS.length - 1))
  );
  
  const curStop = DEMO_ROUTE_STOPS[stopIndex];
  const nextStop = DEMO_ROUTE_STOPS[stopIndex + 1] || DEMO_ROUTE_STOPS[DEMO_ROUTE_STOPS.length - 1];

  const distToNextStop = calculateDistance(currentPt.lat, currentPt.lng, nextStop.lat, nextStop.lng);
  const nominalMinutes = Math.max(1, Math.round((distToNextStop / 1000) / (currentSpeed / 60)));
  const etaMinutes = nominalMinutes + (demoState.delayMinutes || 0);

  const status = demoState.delayMinutes > 3 ? 'delayed' : 'on_time';

  const telemetryPayload = {
    id: demoState.busId,
    busId: demoState.busId,
    busNumber: demoState.busNumber,
    plateNumber: demoState.plateNumber,
    routeId: 'demo-route-delhi-dairy',
    routeNumber: demoState.routeNumber,
    routeName: demoState.routeName,
    origin: 'Delhi Gate Terminal',
    destination: 'Dairy Chowk Terminal',
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
    driverName: 'Demo Simulation System',
    conductorName: 'Simulated Duty',
    busType: 'EV Metro Shuttle',
    isDemo: true,
    lastUpdated: new Date().toISOString()
  };

  // Update isolated demo storage
  demoBuses.set(demoState.busId, telemetryPayload);
  demoState.lat = currentPt.lat;
  demoState.lng = currentPt.lng;
  demoState.speedKmh = currentSpeed;
  demoState.heading = heading;
  demoState.currentStopName = curStop.name;
  demoState.nextStopName = nextStop.name;
  demoState.etaToNextMinutes = etaMinutes;
  demoState.status = status;

  // Broadcast to demo room AND main locationUpdate channel so passenger/admin maps receive it
  io.emit('locationUpdate', telemetryPayload);
  io.to('demo-tracking').emit('demoLocationUpdate', telemetryPayload);
}

function startDemoSimulator(options = {}) {
  const speedMult = Math.min(10, Math.max(1, options.speedMultiplier || 1));
  const delay = Math.max(0, options.delayMinutes || 0);
  
  demoState.isRunning = true;
  demoState.speedMultiplier = speedMult;
  demoState.delayMinutes = delay;

  if (demoInterval) clearInterval(demoInterval);
  
  // Calculate interval based on speed: base is 1.5 seconds per waypoint
  const intervalMs = Math.max(300, Math.round(1500 / speedMult));
  demoInterval = setInterval(tickDemoSimulator, intervalMs);

  // Trigger immediate tick
  tickDemoSimulator();
  
  io.emit('demoStatus', { isRunning: true, ...demoState });
  return { success: true, message: 'Demo Simulator started', state: demoState };
}

function stopDemoSimulator() {
  demoState.isRunning = false;
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  // Clean up demo bus from active in-memory list
  demoBuses.delete(demoState.busId);
  
  // Inform all maps to clean up the demo marker
  io.emit('busOffline', demoState.busId);
  io.to('demo-tracking').emit('demoStopped', { busId: demoState.busId });
  io.emit('demoStatus', { isRunning: false, ...demoState });

  return { success: true, message: 'Demo Simulator stopped' };
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
    if (demoBuses.has(demoState.busId)) {
      socket.emit('demoLocationUpdate', demoBuses.get(demoState.busId));
    }
  });

  // PRODUCTION GPS LOCATION UPDATES (from real mobile drivers)
  socket.on('updateLocation', (data) => {
    if (!data || !data.busId) return;

    // Prevent simulated or demo data from ever writing to activeBuses
    if (data.isDemo || data.id === demoState.busId) {
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
    if (busId === demoState.busId) {
      stopDemoSimulator();
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
