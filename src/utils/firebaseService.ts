import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebaseClient';

/**
 * Strips all undefined fields recursively to prevent Firestore 
 * "Unsupported field value: undefined" errors when saving documents.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = cleanFirestoreData(value);
      }
    }
    return result;
  }
  return obj;
}

export interface FirebaseRouteStop {
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  sequence: number;
  estimatedMinutesFromOrigin: number;
}

export interface FirebaseRoute {
  id: string;
  route_number: string;
  routeNumber?: string;
  name: string;
  origin: string;
  destination: string;
  color?: string;
  route_path?: { lat: number; lng: number }[];
  stops: FirebaseRouteStop[];
  created_at?: string;
}

export interface FirebaseBus {
  id: string;
  bus_number: string;
  busNumber?: string;
  plate_number: string;
  plateNumber?: string;
  capacity: number;
  type: string;
  status: string;
  route_id?: string;
  routeId?: string;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  heading?: number;
  created_at?: string;
}

export interface FirebaseLiveLocation {
  bus_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  route_id?: string;
  updated_at: string;
}

// ==================== ROUTES ====================

export async function getFirebaseRoutes(): Promise<FirebaseRoute[]> {
  try {
    const q = collection(db, 'routes');
    const snapshot = await getDocs(q);
    const routes: FirebaseRoute[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as FirebaseRoute;
      routes.push({
        ...data,
        id: docSnap.id,
        routeNumber: data.route_number || (data as any).routeNumber,
      });
    });
    return routes;
  } catch (err) {
    console.warn('Firebase getFirebaseRoutes fallback error:', err);
    return [];
  }
}

export async function saveFirebaseRoute(route: FirebaseRoute): Promise<void> {
  const routeRef = doc(db, 'routes', route.id);
  const data = cleanFirestoreData({
    ...route,
    route_number: route.route_number || route.routeNumber,
    created_at: route.created_at || new Date().toISOString()
  });
  await setDoc(routeRef, data, { merge: true });
}

export async function deleteFirebaseRoute(routeId: string): Promise<void> {
  await deleteDoc(doc(db, 'routes', routeId));
}

// ==================== BUSES ====================

export async function getFirebaseBuses(): Promise<FirebaseBus[]> {
  try {
    const q = collection(db, 'buses');
    const snapshot = await getDocs(q);
    const buses: FirebaseBus[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as FirebaseBus;
      buses.push({
        ...data,
        id: docSnap.id,
        bus_number: data.bus_number || (data as any).busNumber,
        plate_number: data.plate_number || (data as any).plateNumber,
      });
    });
    return buses;
  } catch (err) {
    console.warn('Firebase getFirebaseBuses fallback error:', err);
    return [];
  }
}

export async function saveFirebaseBus(bus: FirebaseBus): Promise<void> {
  const busRef = doc(db, 'buses', bus.id);
  const data = cleanFirestoreData({
    ...bus,
    bus_number: bus.bus_number || bus.busNumber,
    plate_number: bus.plate_number || bus.plateNumber,
    created_at: bus.created_at || new Date().toISOString()
  });
  await setDoc(busRef, data, { merge: true });
}

export async function deleteFirebaseBus(busId: string): Promise<void> {
  await deleteDoc(doc(db, 'buses', busId));
  // Also clean up any live location record
  try {
    await deleteDoc(doc(db, 'live_locations', busId));
  } catch (_) {}
}

// ==================== LIVE LOCATIONS ====================

export async function updateFirebaseLiveLocation(loc: FirebaseLiveLocation): Promise<void> {
  const locRef = doc(db, 'live_locations', loc.bus_id);
  const data = cleanFirestoreData({
    ...loc,
    updated_at: new Date().toISOString()
  });
  await setDoc(locRef, data, { merge: true });
}

export function subscribeFirebaseLiveLocations(
  callback: (locations: FirebaseLiveLocation[]) => void
): () => void {
  const colRef = collection(db, 'live_locations');
  return onSnapshot(colRef, (snapshot) => {
    const list: FirebaseLiveLocation[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as FirebaseLiveLocation);
    });
    callback(list);
  }, (err) => {
    console.warn('Firebase live_locations onSnapshot warning:', err);
  });
}

// ==================== DRIVERS ====================

export interface FirebaseDriver {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  assigned_bus_id?: string;
  status?: string;
  created_at?: string;
}

export async function getFirebaseDrivers(): Promise<FirebaseDriver[]> {
  try {
    const q = collection(db, 'driver_credentials');
    const snapshot = await getDocs(q);
    const drivers: FirebaseDriver[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as FirebaseDriver;
      if (data.status !== 'Deleted') {
        drivers.push({
          ...data,
          id: docSnap.id
        });
      }
    });
    return drivers;
  } catch (err) {
    console.warn('Firebase getFirebaseDrivers fallback notice:', err);
    return [];
  }
}

export async function saveFirebaseDriver(driver: FirebaseDriver): Promise<void> {
  const driverRef = doc(db, 'driver_credentials', driver.id);
  const data = cleanFirestoreData({
    ...driver,
    created_at: driver.created_at || new Date().toISOString()
  });
  await setDoc(driverRef, data, { merge: true });
}

export async function deleteFirebaseDriver(driverId: string): Promise<void> {
  await deleteDoc(doc(db, 'driver_credentials', driverId));
}

// ==================== CONDUCTORS ====================

export interface FirebaseConductor {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  created_at?: string;
}

export async function getFirebaseConductors(): Promise<FirebaseConductor[]> {
  try {
    const q = collection(db, 'conductors');
    const snapshot = await getDocs(q);
    const conductors: FirebaseConductor[] = [];
    snapshot.forEach(docSnap => {
      conductors.push({
        ...docSnap.data() as FirebaseConductor,
        id: docSnap.id
      });
    });
    return conductors;
  } catch (err) {
    console.warn('Firebase getFirebaseConductors fallback notice:', err);
    return [];
  }
}

export async function saveFirebaseConductor(conductor: FirebaseConductor): Promise<void> {
  const condRef = doc(db, 'conductors', conductor.id);
  const data = cleanFirestoreData({
    ...conductor,
    role: conductor.role || 'CONDUCTOR',
    created_at: conductor.created_at || new Date().toISOString()
  });
  await setDoc(condRef, data, { merge: true });
}

export async function deleteFirebaseConductor(conductorId: string): Promise<void> {
  await deleteDoc(doc(db, 'conductors', conductorId));
}

// ==================== TRIPS ====================

export interface FirebaseTrip {
  id: string;
  route_id: string;
  bus_id: string;
  driver_id: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  created_at?: string;
}

export async function getFirebaseTrips(): Promise<FirebaseTrip[]> {
  try {
    const q = collection(db, 'trips');
    const snapshot = await getDocs(q);
    const trips: FirebaseTrip[] = [];
    snapshot.forEach(docSnap => {
      trips.push({
        ...docSnap.data() as FirebaseTrip,
        id: docSnap.id
      });
    });
    return trips;
  } catch (err) {
    console.warn('Firebase getFirebaseTrips fallback notice:', err);
    return [];
  }
}

export async function saveFirebaseTrip(trip: FirebaseTrip): Promise<void> {
  const tripRef = doc(db, 'trips', trip.id);
  const data = cleanFirestoreData({
    ...trip,
    created_at: trip.created_at || new Date().toISOString()
  });
  await setDoc(tripRef, data, { merge: true });
}

export async function deleteFirebaseTrip(tripId: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId));
}

// ==================== ANNOUNCEMENTS ====================

export interface FirebaseAnnouncement {
  id: string;
  title: string;
  message: string;
  priority?: 'info' | 'warning' | 'critical';
  created_at?: string;
}

export async function getFirebaseAnnouncements(): Promise<FirebaseAnnouncement[]> {
  try {
    const q = collection(db, 'announcements');
    const snapshot = await getDocs(q);
    const list: FirebaseAnnouncement[] = [];
    snapshot.forEach(docSnap => {
      list.push({
        ...docSnap.data() as FirebaseAnnouncement,
        id: docSnap.id
      });
    });
    return list;
  } catch {
    return [];
  }
}

export async function saveFirebaseAnnouncement(item: FirebaseAnnouncement): Promise<void> {
  const ref = doc(db, 'announcements', item.id);
  const data = cleanFirestoreData({
    ...item,
    created_at: item.created_at || new Date().toISOString()
  });
  await setDoc(ref, data, { merge: true });
}

export async function deleteFirebaseAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'announcements', id));
}

// ==================== COUNTS & CLEANUP ====================

export async function getFirebaseCounts(): Promise<{
  buses: number;
  routes: number;
  drivers: number;
  conductors: number;
  trips: number;
  liveLocations: number;
  announcements: number;
}> {
  try {
    const [busesSnap, routesSnap, driversSnap, condsSnap, tripsSnap, liveSnap, annSnap] = await Promise.all([
      getDocs(collection(db, 'buses')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'routes')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'driver_credentials')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'conductors')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'trips')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'live_locations')).catch(() => ({ size: 0 })),
      getDocs(collection(db, 'announcements')).catch(() => ({ size: 0 }))
    ]);

    return {
      buses: busesSnap.size || 0,
      routes: routesSnap.size || 0,
      drivers: driversSnap.size || 0,
      conductors: condsSnap.size || 0,
      trips: tripsSnap.size || 0,
      liveLocations: liveSnap.size || 0,
      announcements: annSnap.size || 0
    };
  } catch {
    return { buses: 0, routes: 0, drivers: 0, conductors: 0, trips: 0, liveLocations: 0, announcements: 0 };
  }
}

export async function clearFirebaseCollection(colName: string): Promise<void> {
  try {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
  } catch (err) {
    console.warn(`Error clearing Firebase collection ${colName}:`, err);
  }
}
