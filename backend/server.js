const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// =========================================================================
// FIREBASE FIRESTORE — REAL DRIVER GPS ONLY
// Demo simulation NEVER touches Firebase (0 reads, 0 writes)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCXFh81NPGfD7VNQ2-wIvv_95YqAZzA3UU",
  authDomain: "nagarst-16040.firebaseapp.com",
  projectId: "nagarst-16040",
  storageBucket: "nagarst-16040.firebasestorage.app",
  messagingSenderId: "905215853273",
  appId: "1:905215853273:web:f36a799788874ba89a74c8",
  measurementId: "G-2SY06TRPY2"
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
  console.log('✅ Firebase connected (real driver GPS only — demo uses 0 Firebase reads/writes)');
} catch (fbInitErr) {
  console.warn('⚠️ Firebase optional init:', fbInitErr.message);
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

// Real driver GPS only — never called for demo buses
async function syncRealDriverToFirebase(payload) {
  if (!fbDb || !payload) return;
  const id = payload.busId || payload.id;
  if (!id || id.startsWith('demo-') || payload.isDemo || (payload.routeName || '').includes('[DEMO]')) return;
  try {
    await setDoc(doc(fbDb, 'live_locations', id), cleanFirestoreData({ ...payload, updated_at: new Date().toISOString() }), { merge: true });
  } catch (_) {}
}

async function removeRealDriverFromFirebase(busId) {
  if (!fbDb || !busId || String(busId).startsWith('demo-')) return;
  try { await deleteDoc(doc(fbDb, 'live_locations', busId)); } catch (_) {}
}

// =========================================================================
// EXPRESS + SOCKET.IO
// =========================================================================
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// =========================================================================
// DATA STORES — Strictly separated, never mixed
// =========================================================================
const activeLiveDrivers = new Map(); // Real GPS drivers only
const demoBuses = new Map();         // Demo simulator buses only

// =========================================================================
// GEOMETRY HELPERS
// =========================================================================
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compassBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function densifyPath(path, targetPoints = 150) {
  if (!path || path.length === 0) return [];
  if (path.length === 1) return [path[0], path[0]];
  if (path.length >= targetPoints) return path;
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDist += haversineMeters(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng);
  }
  if (totalDist <= 0) return path;
  const result = [{ lat: path[0].lat, lng: path[0].lng }];
  const stepDist = totalDist / (targetPoints - 1);
  for (let p = 1; p < targetPoints - 1; p++) {
    const target = p * stepDist;
    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = haversineMeters(path[i].lat, path[i].lng, path[i+1].lat, path[i+1].lng);
      if (acc + seg >= target) {
        const ratio = seg > 0 ? (target - acc) / seg : 0;
        result.push({
          lat: Number((path[i].lat + (path[i+1].lat - path[i].lat) * ratio).toFixed(6)),
          lng: Number((path[i].lng + (path[i+1].lng - path[i].lng) * ratio).toFixed(6)),
        });
        break;
      }
      acc += seg;
    }
  }
  result.push({ lat: path[path.length-1].lat, lng: path[path.length-1].lng });
  return result;
}

// =========================================================================
// DEMO SIMULATOR ENGINE — Server-Side, Zero Firebase
// Fleet config provided by Admin via Socket.IO 'configureDemo' event
// =========================================================================
let DEMO_FLEET_CONFIG = [];
let demoInterval = null;
const demoState = { isRunning: false, speedMultiplier: 1, delayMinutes: 0, activeBusCount: 0 };

function calcPathDistance(wpList, fromIdx, toIdx) {
  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  let total = 0;
  for (let i = start; i < end && i < wpList.length - 1; i++) {
    total += haversineMeters(wpList[i].lat, wpList[i].lng, wpList[i + 1].lat, wpList[i + 1].lng);
  }
  return total;
}

function findClosestWp(pt, wpList) {
  let minD = Infinity, best = 0;
  for (let i = 0; i < wpList.length; i++) {
    const d = haversineMeters(pt.lat, pt.lng, wpList[i].lat, wpList[i].lng);
    if (d < minD) { minD = d; best = i; }
  }
  return best;
}

function buildDemoTelemetry(busConfig) {
  const wp = busConfig.waypoints;
  if (!wp || wp.length < 2) return null;
  const curIdx = busConfig.currentIndex;
  const curPt = wp[curIdx] || wp[0];
  const nextPt = wp[Math.min(curIdx + 1, wp.length - 1)] || wp[0];
  const heading = Math.round(compassBearing(curPt.lat, curPt.lng, nextPt.lat, nextPt.lng));
  // Cruising transit speed centered at 50 km/h
  const speedKmh = Math.max(40, 48 + Math.floor(Math.sin(curIdx * 0.4) * 4));

  const stops = busConfig.stops || [];
  let curStop = { id: 'origin-stop', name: busConfig.origin || 'Terminal' };
  let nextStop = { id: 'dest-stop', name: busConfig.destination || 'Destination' };
  let distToNext = 500;
  let stopsSchedule = [];

  if (stops.length >= 2) {
    const mappedStops = stops.map((s, idx) => ({
      stop: s,
      idx,
      wpIdx: findClosestWp(s, wp)
    }));

    if (busConfig.direction === 1) {
      let upcoming = mappedStops.find(m => m.wpIdx > curIdx || (m.wpIdx === curIdx && haversineMeters(curPt.lat, curPt.lng, m.stop.lat, m.stop.lng) > 35));
      if (!upcoming) upcoming = mappedStops[mappedStops.length - 1];

      const upcomingIdx = upcoming.idx;
      const prevIdx = Math.max(0, upcomingIdx - 1);
      curStop = stops[prevIdx] || stops[0];
      nextStop = upcoming.stop;

      distToNext = calcPathDistance(wp, curIdx, upcoming.wpIdx);

      stopsSchedule = mappedStops.map(m => {
        const isPassed = m.wpIdx < curIdx && haversineMeters(curPt.lat, curPt.lng, m.stop.lat, m.stop.lng) > 60;
        const isNext = m.idx === upcomingIdx;
        const dMeters = isPassed ? 0 : calcPathDistance(wp, curIdx, m.wpIdx);
        // Time at 50 km/h: time in minutes = (dMeters / 1000) / (speedKmh / 60)
        const nominalMin = (dMeters / 1000) / (speedKmh / 60);
        const etaMin = dMeters < 80 ? 0 : Math.max(1, Math.round(nominalMin)) + (demoState.delayMinutes || 0);
        return {
          stopId: m.stop.id || `stop-${m.idx}`,
          stopName: m.stop.name || m.stop.stopName,
          distanceMeters: Math.round(dMeters),
          etaMinutes: etaMin,
          isPassed,
          isNext
        };
      });
    } else {
      let upcoming = [...mappedStops].reverse().find(m => m.wpIdx < curIdx || (m.wpIdx === curIdx && haversineMeters(curPt.lat, curPt.lng, m.stop.lat, m.stop.lng) > 35));
      if (!upcoming) upcoming = mappedStops[0];

      const upcomingIdx = upcoming.idx;
      const prevIdx = Math.min(mappedStops.length - 1, upcomingIdx + 1);
      curStop = stops[prevIdx] || stops[stops.length - 1];
      nextStop = upcoming.stop;

      distToNext = calcPathDistance(wp, upcoming.wpIdx, curIdx);

      stopsSchedule = mappedStops.map(m => {
        const isPassed = m.wpIdx > curIdx && haversineMeters(curPt.lat, curPt.lng, m.stop.lat, m.stop.lng) > 60;
        const isNext = m.idx === upcomingIdx;
        const dMeters = isPassed ? 0 : calcPathDistance(wp, m.wpIdx, curIdx);
        const nominalMin = (dMeters / 1000) / (speedKmh / 60);
        const etaMin = dMeters < 80 ? 0 : Math.max(1, Math.round(nominalMin)) + (demoState.delayMinutes || 0);
        return {
          stopId: m.stop.id || `stop-${m.idx}`,
          stopName: m.stop.name || m.stop.stopName,
          distanceMeters: Math.round(dMeters),
          etaMinutes: etaMin,
          isPassed,
          isNext
        };
      });
    }
  }

  const nominalMinutes = (distToNext / 1000) / (speedKmh / 60);
  const eta = distToNext < 80 ? 0 : Math.max(1, Math.round(nominalMinutes)) + (demoState.delayMinutes || 0);

  return {
    id: busConfig.id, busId: busConfig.id,
    busNumber: busConfig.busNumber,
    plateNumber: busConfig.plateNumber || busConfig.busNumber,
    routeId: busConfig.routeId || '',
    routeNumber: `${busConfig.routeNumber || 'R'} (DEMO)`,
    routeName: `${busConfig.routeName || 'Demo Route'} [DEMO]`,
    origin: busConfig.origin || 'Origin',
    destination: busConfig.destination || 'Destination',
    currentStopId: curStop.id || 'stop-0',
    currentStopName: curStop.name || curStop.stopName || 'Terminal',
    nextStopId: nextStop.id || 'stop-1',
    nextStopName: nextStop.name || nextStop.stopName || 'Next Stop',
    etaToNextMinutes: eta,
    delayMinutes: demoState.delayMinutes || 0,
    speedKmh,
    occupancy: 'moderate',
    passengerCount: Math.min(42, Math.max(8, Math.floor(20 + Math.sin(curIdx * 0.2) * 10))),
    maxCapacity: 42,
    availableSeats: 20,
    distanceToNextMeters: Math.round(distToNext),
    status: (demoState.delayMinutes || 0) > 3 ? 'delayed' : 'on_time',
    lat: curPt.lat, lng: curPt.lng, heading,
    driverName: `Demo Pilot (${busConfig.busNumber})`,
    conductorName: 'Simulated Crew',
    busType: 'EV Metro Shuttle',
    isDemo: true,
    batteryLevel: Math.max(42, Math.min(99, 94 - (curIdx % 50))),
    isAc: true,
    temperature: '23°C',
    stopsSchedule,
    lastUpdated: new Date().toISOString()
  };
}

function tickDemoSimulator() {
  if (!demoState.isRunning || DEMO_FLEET_CONFIG.length === 0) return;
  DEMO_FLEET_CONFIG.forEach(busConfig => {
    const wp = busConfig.waypoints;
    if (!wp || wp.length < 2) return;
    let next = busConfig.currentIndex + busConfig.direction;
    if (next >= wp.length) { busConfig.direction = -1; next = wp.length - 2; }
    else if (next < 0) { busConfig.direction = 1; next = 1; }
    busConfig.currentIndex = Math.max(0, Math.min(wp.length - 1, next));
    const telemetry = buildDemoTelemetry(busConfig);
    if (!telemetry) return;
    demoBuses.set(busConfig.id, telemetry);
    // Broadcast via Socket.IO ONLY — zero Firebase
    io.emit('demoLocationUpdate', telemetry);
    io.emit('locationUpdate', telemetry); // passenger dashboard catches locationUpdate
  });
}

function startDemoSimulator(options = {}) {
  const speedMult = Math.min(10, Math.max(1, options.speedMultiplier || 1));
  demoState.isRunning = true;
  demoState.speedMultiplier = speedMult;
  demoState.delayMinutes = Math.max(0, options.delayMinutes || 0);
  demoState.activeBusCount = DEMO_FLEET_CONFIG.length;
  if (demoInterval) clearInterval(demoInterval);
  const intervalMs = Math.max(80, Math.round(250 / speedMult));
  demoInterval = setInterval(tickDemoSimulator, intervalMs);
  tickDemoSimulator(); // immediate first tick
  io.emit('demoStatus', { isRunning: true, ...demoState, activeBusCount: DEMO_FLEET_CONFIG.length });
  return { success: true, message: `Demo started (${DEMO_FLEET_CONFIG.length} buses, ${intervalMs}ms)`, state: demoState };
}

function stopDemoSimulator() {
  demoState.isRunning = false;
  demoState.activeBusCount = 0;
  if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
  DEMO_FLEET_CONFIG.forEach(b => {
    demoBuses.delete(b.id);
    io.emit('busOffline', b.id);
  });
  io.emit('demoStatus', { isRunning: false, ...demoState });
  return { success: true, message: 'Demo stopped' };
}

function resetDemoSimulator(options = {}) {
  DEMO_FLEET_CONFIG.forEach(b => { b.currentIndex = 0; b.direction = 1; });
  demoBuses.clear();
  return startDemoSimulator(options);
}

// =========================================================================
// SOCKET.IO EVENTS
// =========================================================================
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state to new connection
  if (activeLiveDrivers.size > 0) socket.emit('initialLocations', [...activeLiveDrivers.values()]);
  if (demoBuses.size > 0) socket.emit('initialDemoBuses', [...demoBuses.values()]);
  socket.emit('demoStatus', { isRunning: demoState.isRunning, ...demoState, activeBusCount: DEMO_FLEET_CONFIG.length });

  socket.on('joinDemoRoom', () => {
    socket.join('demo-tracking');
    demoBuses.forEach(bus => socket.emit('demoLocationUpdate', bus));
  });

  // Admin sends fleet config before starting demo or when fleet changes
  socket.on('configureDemo', (data) => {
    if (!data || !Array.isArray(data.buses)) return;
    const wasRunning = demoState.isRunning;
    if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }

    DEMO_FLEET_CONFIG = data.buses
      .filter(b => b && b.id && Array.isArray(b.waypoints) && b.waypoints.length >= 2)
      .map(b => ({
        id: b.id,
        busNumber: b.busNumber || b.id,
        plateNumber: b.plateNumber || b.busNumber || b.id,
        routeId: b.routeId || '',
        routeNumber: b.routeNumber || '',
        routeName: b.routeName || '',
        origin: b.origin || '',
        destination: b.destination || '',
        stops: b.stops || [],
        waypoints: densifyPath(b.waypoints, 150),
        currentIndex: 0,
        direction: 1,
        speedMultiplier: b.speedMultiplier || 1
      }));

    // Purge any buses in demoBuses that are no longer part of DEMO_FLEET_CONFIG
    const validIds = new Set();
    const norm = (s) => String(s || '').trim().toUpperCase().replace(/[\s-_]/g, '');
    DEMO_FLEET_CONFIG.forEach(b => {
      validIds.add(norm(b.id));
      validIds.add(norm(b.busNumber));
      validIds.add(norm(b.plateNumber));
    });

    for (const [key, val] of demoBuses.entries()) {
      const match = validIds.has(norm(key)) || validIds.has(norm(val?.id)) || validIds.has(norm(val?.busNumber)) || validIds.has(norm(val?.plateNumber));
      if (!match) {
        demoBuses.delete(key);
        io.emit('busOffline', key);
        io.emit('demoLocationUpdate', { id: key, busId: key, offline: true, isDeleted: true });
        io.emit('locationUpdate', { id: key, busId: key, offline: true, isDeleted: true });
      }
    }

    demoState.activeBusCount = DEMO_FLEET_CONFIG.length;
    console.log(`✅ configureDemo: ${DEMO_FLEET_CONFIG.length} buses configured`);
    socket.emit('demoConfigured', {
      success: true, busCount: DEMO_FLEET_CONFIG.length,
      buses: DEMO_FLEET_CONFIG.map(b => ({ id: b.id, busNumber: b.busNumber, routeNumber: b.routeNumber }))
    });

    if (wasRunning && DEMO_FLEET_CONFIG.length > 0) {
      startDemoSimulator({ speedMultiplier: demoState.speedMultiplier, delayMinutes: demoState.delayMinutes });
    } else {
      demoState.isRunning = false;
      io.emit('demoStatus', { isRunning: false, ...demoState, activeBusCount: DEMO_FLEET_CONFIG.length });
    }
  });

  socket.on('startDemo', (params) => {
    if (DEMO_FLEET_CONFIG.length === 0) {
      socket.emit('demoError', { message: 'No buses configured. Send configureDemo first.' });
      return;
    }
    startDemoSimulator(params);
  });

  socket.on('resetDemo', (params) => { resetDemoSimulator(params); });
  socket.on('stopDemo', () => { stopDemoSimulator(); });

  socket.on('setDemoSpeed', (data) => {
    const speedMult = Math.min(10, Math.max(1, data?.speedMultiplier || 1));
    demoState.speedMultiplier = speedMult;
    if (demoState.isRunning) {
      if (demoInterval) clearInterval(demoInterval);
      demoInterval = setInterval(tickDemoSimulator, Math.max(80, Math.round(250 / speedMult)));
    }
    io.emit('demoStatus', { ...demoState });
  });

  socket.on('setDemoDelay', (data) => {
    demoState.delayMinutes = Math.max(0, data?.delayMinutes || 0);
    io.emit('demoStatus', { ...demoState });
  });

  // Real driver GPS (writes to Firebase only for non-demo buses)
  socket.on('updateLocation', (data) => {
    if (!data) return;
    const busId = data.busId || data.id;
    if (!busId) return;
    if (data.isDemo || String(busId).startsWith('demo-') || (data.routeName || '').includes('[DEMO]')) {
      // If server simulator is running, server is the sole master ticker. Ignore client simulated locations to prevent rubber-banding
      if (demoState.isRunning) return;
      const payload = { ...data, id: busId, busId, isDemo: true };
      demoBuses.set(busId, payload);
      io.emit('demoLocationUpdate', payload);
      io.emit('locationUpdate', payload);
      return;
    }
    const livePayload = { ...data, id: busId, busId };
    activeLiveDrivers.set(busId, livePayload);
    io.emit('locationUpdate', livePayload);
    syncRealDriverToFirebase(livePayload); // Firebase for real drivers only
  });

  const purgeBus = (busId) => {
    if (!busId) return;
    const norm = (s) => String(s || '').trim().toUpperCase().replace(/[\s-_]/g, '');
    const target = norm(busId);
    if (!target) return;

    // 1. Remove from DEMO_FLEET_CONFIG
    DEMO_FLEET_CONFIG = DEMO_FLEET_CONFIG.filter(b => 
      norm(b.id) !== target && 
      norm(b.busNumber) !== target && 
      norm(b.plateNumber) !== target
    );
    demoState.activeBusCount = DEMO_FLEET_CONFIG.length;

    // 2. Remove from demoBuses Map
    for (const [key, val] of demoBuses.entries()) {
      if (
        norm(key) === target || 
        norm(val?.id) === target || 
        norm(val?.busNumber) === target || 
        norm(val?.plateNumber) === target
      ) {
        demoBuses.delete(key);
      }
    }

    // 3. Remove from activeLiveDrivers Map
    for (const [key, val] of activeLiveDrivers.entries()) {
      if (
        norm(key) === target || 
        norm(val?.id) === target || 
        norm(val?.busNumber) === target || 
        norm(val?.plateNumber) === target
      ) {
        activeLiveDrivers.delete(key);
      }
    }

    // 4. Emit offline and deleted payload across all channels to all connected dashboards
    io.emit('busOffline', busId);
    io.emit('demoLocationUpdate', { id: busId, busId, offline: true, isDeleted: true });
    io.emit('locationUpdate', { id: busId, busId, offline: true, isDeleted: true });
    io.emit('demoStatus', { ...demoState, activeBusCount: DEMO_FLEET_CONFIG.length });

    if (!String(busId).startsWith('demo-')) {
      removeRealDriverFromFirebase(busId);
    }
  };

  socket.on('stopTrip', (busId) => {
    purgeBus(busId);
  });

  socket.on('deleteBus', (busId) => {
    purgeBus(busId);
  });

  socket.on('sendDispatchMessage', (data) => { io.emit('dispatchMessage', data); });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// =========================================================================
// REST API
// =========================================================================
app.get('/api/health', (req, res) => res.json({
  status: 'ok', timestamp: new Date().toISOString(),
  demo: { isRunning: demoState.isRunning, busCount: DEMO_FLEET_CONFIG.length },
  liveDrivers: activeLiveDrivers.size, firebaseConnected: Boolean(fbDb)
}));

app.get('/api/demo/status', (req, res) => res.json({
  isRunning: demoState.isRunning, state: demoState,
  fleet: DEMO_FLEET_CONFIG.map(b => ({ id: b.id, busNumber: b.busNumber, routeNumber: b.routeNumber, waypointCount: b.waypoints.length })),
  activeBusCount: DEMO_FLEET_CONFIG.length
}));

app.post('/api/demo/configure', (req, res) => {
  const { buses } = req.body || {};
  if (!Array.isArray(buses)) return res.status(400).json({ success: false, message: 'buses array required' });
  if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
  demoState.isRunning = false;
  DEMO_FLEET_CONFIG = buses
    .filter(b => b && b.id && Array.isArray(b.waypoints) && b.waypoints.length >= 2)
    .map(b => ({
      id: b.id, busNumber: b.busNumber || b.id, plateNumber: b.plateNumber || b.busNumber || b.id,
      routeId: b.routeId || '', routeNumber: b.routeNumber || '', routeName: b.routeName || '',
      origin: b.origin || '', destination: b.destination || '',
      stops: b.stops || [], waypoints: densifyPath(b.waypoints, 150),
      currentIndex: 0, direction: 1, speedMultiplier: b.speedMultiplier || 1
    }));
  res.json({ success: true, busCount: DEMO_FLEET_CONFIG.length });
});

app.post('/api/demo/start', (req, res) => {
  const { speedMultiplier = 1, delayMinutes = 0 } = req.body || {};
  if (DEMO_FLEET_CONFIG.length === 0) return res.status(400).json({ success: false, message: 'No buses configured. POST to /api/demo/configure first.' });
  res.json(startDemoSimulator({ speedMultiplier, delayMinutes }));
});

app.post('/api/demo/reset', (req, res) => {
  const { speedMultiplier = 1 } = req.body || {};
  res.json(resetDemoSimulator({ speedMultiplier }));
});

app.post('/api/demo/stop', (req, res) => res.json(stopDemoSimulator()));

app.post('/api/demo/speed', (req, res) => {
  const speedMult = Math.min(10, Math.max(1, req.body?.speedMultiplier || 1));
  demoState.speedMultiplier = speedMult;
  if (demoState.isRunning) {
    if (demoInterval) clearInterval(demoInterval);
    demoInterval = setInterval(tickDemoSimulator, Math.max(80, Math.round(250 / speedMult)));
    io.emit('demoStatus', { ...demoState });
  }
  res.json({ success: true, speedMultiplier: demoState.speedMultiplier });
});

app.get('/api/firebase/status', async (req, res) => {
  try {
    if (!fbDb) return res.status(500).json({ connected: false });
    const [b, r, l, u] = await Promise.all([
      getDocs(collection(fbDb, 'buses')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'routes')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'live_locations')).catch(() => ({ size: 0 })),
      getDocs(collection(fbDb, 'users')).catch(() => ({ size: 0 }))
    ]);
    res.json({
      connected: true, projectId: 'nagarst-16040',
      collections: { buses: b.size || 0, routes: r.size || 0, live_locations: l.size || 0, users: u.size || 0 },
      simulatorRunning: demoState.isRunning, activeBuses: DEMO_FLEET_CONFIG.length,
      demoFirebaseWrites: 0, timestamp: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ connected: false, error: err.message }); }
});

app.post('/api/firebase/clear-collection', async (req, res) => {
  try {
    const { collectionName } = req.body || {};
    if (!collectionName || !fbDb) return res.status(400).json({ success: false });
    const snap = await getDocs(collection(fbDb, collectionName));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    res.json({ success: true, deletedCount: snap.size });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚌 NagarST Bus Tracking Server — Port ${PORT}`);
  console.log(`   Demo: 100% Socket.IO (0 Firebase reads/writes)`);
  console.log(`   Real GPS: Socket.IO + Firebase live_locations (6s debounce)\n`);
});
