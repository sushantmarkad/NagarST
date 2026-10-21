const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// =========================================================================
// FIREBASE FIRESTORE INTEGRATION (Backend Control)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCbxsoLoqqKQIORWGwMg4pJtkjYFJY3G5E",
  authDomain: "nagarst-2111f.firebaseapp.com",
  projectId: "nagarst-2111f",
  storageBucket: "nagarst-2111f.firebasestorage.app",
  messagingSenderId: "763785088493",
  appId: "1:763785088493:web:6d1b2954f0c08d8b24ebe4",
  measurementId: "G-1HFLYM8T8R"
};

let fbDb = null;
let setDoc, doc, deleteDoc, collection, getDocs;

try {
  const { initializeApp } = require('firebase/app');
  const firestore = require('firebase/firestore');
  setDoc = firestore.setDoc;
  doc = firestore.doc;
  deleteDoc = firestore.deleteDoc;
  collection = firestore.collection;
  getDocs = firestore.getDocs;

  const fbApp = initializeApp(firebaseConfig);
  fbDb = firestore.getFirestore(fbApp);
  console.log('✅ Firebase Firestore connected in backend server (project: nagarst-2111f)');
} catch (fbInitErr) {
  console.warn('⚠️ Firebase optional initialization in backend:', fbInitErr.message);
}

function cleanFirestoreData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(cleanFirestoreData);
  if (typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) res[k] = cleanFirestoreData(v);
    }
    return res;
  }
  return obj;
}

async function syncToFirebaseLive(busPayload) {
  if (!fbDb || !busPayload) return;
  try {
    const id = busPayload.busId || busPayload.id;
    if (!id) return;
    const cleanData = cleanFirestoreData({
      ...busPayload,
      updated_at: new Date().toISOString()
    });
    await setDoc(doc(fbDb, 'live_locations', id), cleanData, { merge: true });
  } catch (err) {
    // silently catch network latency
  }
}

async function removeFirebaseLive(busId) {
  if (!fbDb || !busId) return;
  try {
    await deleteDoc(doc(fbDb, 'live_locations', busId));
  } catch (err) {}
}

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

// Helper: Densify waypoints along road corridor so buses glide smoothly (~25m between points)
function densifyServerPath(path, targetPoints = 120) {
  if (!path || path.length === 0) return [];
  if (path.length === 1) return [path[0], path[0]];
  if (path.length >= targetPoints) return path;

  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDist += calculateDistance(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
  }
  if (totalDist <= 0) return path;

  const result = [];
  const stepDist = totalDist / (targetPoints - 1);
  result.push({ lat: path[0].lat, lng: path[0].lng });

  for (let p = 1; p < targetPoints - 1; p++) {
    const targetDist = p * stepDist;
    let accumulated = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const segDist = calculateDistance(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
      if (accumulated + segDist >= targetDist) {
        const remaining = targetDist - accumulated;
        const ratio = segDist > 0 ? remaining / segDist : 0;
        result.push({
          lat: Number((path[i].lat + (path[i + 1].lat - path[i].lat) * ratio).toFixed(6)),
          lng: Number((path[i].lng + (path[i + 1].lng - path[i].lng) * ratio).toFixed(6)),
        });
        break;
      }
      accumulated += segDist;
    }
  }
  result.push({ lat: path[path.length - 1].lat, lng: path[path.length - 1].lng });
  return result;
}

// =========================================================================
// MULTI-BUS SIMULATOR ENGINE (Server-Side)
// =========================================================================
const DEMO_FLEET_CONFIG = [];

let demoInterval = null;
let demoState = {
  isRunning: false,
  speedMultiplier: 1,
  delayMinutes: 0,
  activeBusCount: 0
};

function generateBusTelemetry(busConfig, isMoving = true) {
  const waypoints = busConfig.waypoints;
  const currentPt = waypoints[busConfig.currentIndex] || waypoints[0];
  const lookaheadIdx = (busConfig.currentIndex + busConfig.direction + waypoints.length) % waypoints.length;
  const nextPt = waypoints[lookaheadIdx] || waypoints[0];

  const heading = Math.round(calculateBearing(currentPt.lat, currentPt.lng, nextPt.lat, nextPt.lng));
  const baseSpeed = isMoving ? 26 + Math.floor(Math.sin(busConfig.currentIndex) * 6) : 0;
  const currentSpeed = isMoving ? Math.max(16, baseSpeed) : 0;

  const progressRatio = waypoints.length > 1 ? busConfig.currentIndex / (waypoints.length - 1) : 0;
  const stopIndex = Math.min(
    busConfig.stops.length - 2,
    Math.max(0, Math.floor(progressRatio * (busConfig.stops.length - 1)))
  );

  const curStop = busConfig.stops[stopIndex] || busConfig.stops[0];
  const nextStop = busConfig.stops[stopIndex + 1] || busConfig.stops[busConfig.stops.length - 1];

  const distToNextStop = calculateDistance(currentPt.lat, currentPt.lng, nextStop.lat, nextStop.lng);
  const nominalMinutes = Math.max(1, Math.round((distToNextStop / 1000) / (Math.max(16, currentSpeed) / 60)));
  const etaMinutes = nominalMinutes + (demoState.delayMinutes || 0);
  const status = demoState.delayMinutes > 3 ? 'delayed' : 'on_time';

  return {
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
    passengerCount: 22,
    maxCapacity: 42,
    availableSeats: 20,
    distanceToNextMeters: Math.round(distToNextStop),
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
}

// Fleet starts empty until administrator initiates trips or routes
// No automatic pre-population of demo buses

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

    const telemetryPayload = generateBusTelemetry(busConfig, true);
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

  const intervalMs = Math.max(200, Math.round(800 / speedMult));
  demoInterval = setInterval(tickDemoSimulator, intervalMs);

  tickDemoSimulator();

  io.emit('demoStatus', { isRunning: true, ...demoState });
  return { success: true, message: 'Multi-bus Demo Simulator started', state: demoState };
}

function resetDemoSimulator(options = {}) {
  DEMO_FLEET_CONFIG.forEach(b => {
    b.currentIndex = 0;
    b.direction = 1;
  });

  const res = startDemoSimulator(options);
  io.emit('demoReset', { all: true, buses: Array.from(demoBuses.values()) });
  return { success: true, message: 'All Demo Buses reset to origin and running forward', state: demoState };
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
    removeFirebaseLive(b.id);
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

  // PRODUCTION GPS LOCATION UPDATES (from real mobile drivers or frontend simulator)
  socket.on('updateLocation', (data) => {
    if (!data) return;
    const busId = data.busId || data.id;
    if (!busId) return;

    // Prevent simulated or demo data from ever writing to activeBuses
    if (data.isDemo || String(busId).startsWith('demo-')) {
      const payload = { ...data, id: busId, busId: busId, isDemo: true };
      demoBuses.set(busId, payload);
      io.emit('locationUpdate', payload);
      io.to('demo-tracking').emit('demoLocationUpdate', payload);
      // Demo buses never write to Firebase to prevent quota exhaustion
      return;
    }

    // Normal production driver telemetry
    const livePayload = { ...data, id: busId, busId: busId };
    activeBuses.set(busId, livePayload);
    io.emit('locationUpdate', livePayload);
    syncToFirebaseLive(livePayload);
  });

  // BUS OFFLINE OR DELETED
  socket.on('stopTrip', (busId) => {
    if (!busId) return;
    if (String(busId).startsWith('demo-')) {
      demoBuses.delete(busId);
      io.emit('busOffline', busId);
      removeFirebaseLive(busId);
    } else {
      activeBuses.delete(busId);
      io.emit('busOffline', busId);
      removeFirebaseLive(busId);
    }
  });

  socket.on('deleteBus', (busId) => {
    if (!busId) return;
    activeBuses.delete(busId);
    demoBuses.delete(busId);
    io.emit('busOffline', busId);
    removeFirebaseLive(busId);
  });

  // DEMO CONTROLS (Socket-based)
  socket.on('startDemo', (params) => {
    console.log('Received startDemo request:', params);
    startDemoSimulator(params);
  });

  socket.on('resetDemo', (params) => {
    console.log('Received resetDemo request:', params);
    resetDemoSimulator(params);
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
// REST API ENDPOINTS FOR DEMO CONTROLS
// =========================================================================

// Relaxed authorization middleware for demonstration reliability
const requireDemoAuth = (req, res, next) => {
  next();
};

app.get('/api/demo/status', (req, res) => {
  res.json({
    isRunning: demoState.isRunning,
    state: demoState,
    fleet: DEMO_FLEET_CONFIG.map(b => ({ id: b.id, busNumber: b.busNumber, routeNumber: b.routeNumber })),
    activeBusCount: demoState.activeBusCount
  });
});

app.post('/api/demo/start', requireDemoAuth, (req, res) => {
  const { speedMultiplier = 1, delayMinutes = 0 } = req.body || {};
  const result = startDemoSimulator({ speedMultiplier, delayMinutes });
  res.json(result);
});

app.post('/api/demo/reset', requireDemoAuth, (req, res) => {
  const { speedMultiplier = 1 } = req.body || {};
  const result = resetDemoSimulator({ speedMultiplier });
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

// =========================================================================
// SUPER ADMIN FIREBASE CONTROL ENDPOINTS
// =========================================================================
app.get('/api/firebase/status', async (req, res) => {
  try {
    if (!fbDb) {
      return res.status(500).json({ connected: false, message: 'Firebase Firestore is not initialized' });
    }
    const [busesSnap, routesSnap, liveSnap, usersSnap] = await Promise.all([
      getDocs(collection(fbDb, 'buses')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'routes')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'live_locations')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'users')).catch(() => ({ size: 0 }))
    ]);

    res.json({
      connected: true,
      projectId: 'nagarst-2111f',
      collections: {
        buses: busesSnap.size || 0,
        routes: routesSnap.size || 0,
        live_locations: liveSnap.size || 0,
        users: usersSnap.size || 0
      },
      simulatorRunning: demoState.isRunning,
      activeBuses: demoState.activeBusCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.post('/api/firebase/clear-collection', async (req, res) => {
  try {
    const { collectionName } = req.body || {};
    if (!collectionName || !fbDb) {
      return res.status(400).json({ success: false, message: 'Invalid collection name or Firebase uninitialized' });
    }
    const snap = await getDocs(collection(fbDb, collectionName));
    const deletePromises = [];
    snap.forEach(d => deletePromises.push(deleteDoc(d.ref)));
    await Promise.all(deletePromises);
    res.json({ success: true, message: `Successfully cleared collection: ${collectionName}`, deletedCount: snap.size });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO & Demo Simulator Server running on port ${PORT}`);
});
