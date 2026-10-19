export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates the Haversine distance between two coordinates in meters.
 */
export function getDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

/**
 * Calculates the minimum distance from a point to a line segment (in meters).
 */
export function getDistanceToSegment(p: LatLng, v: LatLng, w: LatLng): number {
  const l2 = Math.pow(v.lat - w.lat, 2) + Math.pow(v.lng - w.lng, 2);
  if (l2 === 0) return getDistance(p, v);

  // Consider the line extending the segment, parameterized as v + t (w - v).
  // We find projection of point p onto the line.
  // It falls where t = [(p-v) . (w-v)] / |w-v|^2
  let t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    lat: v.lat + t * (w.lat - v.lat),
    lng: v.lng + t * (w.lng - v.lng),
  };

  return getDistance(p, projection);
}

/**
 * Calculates the minimum distance from a point to an entire polyline (in meters).
 */
export function getDistanceToPolyline(p: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return getDistance(p, polyline[0]);

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = getDistanceToSegment(p, polyline[i], polyline[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

const osrmCache = new Map<string, LatLng[]>();

/**
 * Fetches the snapped road path (polyline) from OSRM given an array of stops, with caching.
 */
export async function fetchOSRMRoute(stops: LatLng[]): Promise<LatLng[]> {
  if (stops.length < 2) return [];

  // OSRM format: lng,lat;lng,lat
  const coordinates = stops.map((s) => `${s.lng.toFixed(5)},${s.lat.toFixed(5)}`).join(';');
  if (osrmCache.has(coordinates)) {
    return osrmCache.get(coordinates)!;
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const geojsonPath = data.routes[0].geometry.coordinates;
      // GeoJSON is [lng, lat], we need [lat, lng] for Leaflet
      const path = geojsonPath.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
      osrmCache.set(coordinates, path);
      return path;
    }
    return [];
  } catch (error) {
    console.warn('OSRM route fetch fallback:', error);
    // Return straight interpolation if network fails
    return stops;
  }
}

/**
 * Fetches the shortest road corridor between origin and destination with distance and duration
 */
export async function fetchShortestRoadCorridor(
  origin: LatLng,
  destination: LatLng
): Promise<{ path: LatLng[]; distanceMeters: number; durationMinutes: number }> {
  const coordinates = `${origin.lng.toFixed(5)},${origin.lat.toFixed(5)};${destination.lng.toFixed(5)},${destination.lat.toFixed(5)}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const geojsonPath = route.geometry.coordinates;
      const path = geojsonPath.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
      osrmCache.set(coordinates, path);
      return {
        path,
        distanceMeters: Math.round(route.distance),
        durationMinutes: Math.max(1, Math.round(route.duration / 60))
      };
    }
  } catch (err) {
    console.warn('Shortest road corridor fetch failed:', err);
  }

  // Fallback direct distance
  const directDist = getDistance(origin, destination);
  return {
    path: [origin, destination],
    distanceMeters: Math.round(directDist),
    durationMinutes: Math.max(1, Math.round((directDist / 1000) / (25 / 60)))
  };
}

/**
 * Finds and sequences all stops in Ahilyanagar that lie within maxDistanceMeters of the road path.
 * Returns stops sorted chronologically from origin to destination along the road.
 */
export function findStopsAlongRoad<T extends { id: string; name: string; lat: number; lng: number }>(
  roadPath: LatLng[],
  candidateStops: T[],
  maxDistanceMeters = 250
): T[] {
  if (roadPath.length < 2 || candidateStops.length === 0) return [];

  const matched: { stop: T; closestIndex: number }[] = [];

  candidateStops.forEach((stop) => {
    let minD = Infinity;
    let closestWpIdx = -1;

    for (let i = 0; i < roadPath.length; i++) {
      const d = getDistance({ lat: stop.lat, lng: stop.lng }, roadPath[i]);
      if (d < minD) {
        minD = d;
        closestWpIdx = i;
      }
    }

    if (minD <= maxDistanceMeters && closestWpIdx !== -1) {
      matched.push({ stop, closestIndex: closestWpIdx });
    }
  });

  // Sort along the road path sequence
  matched.sort((a, b) => a.closestIndex - b.closestIndex);
  return matched.map((m) => m.stop);
}

/**
 * Reverse geocodes coordinates to a human-readable street or area name in Ahilyanagar
 */
export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await res.json();
    const addr = data.address;
    return (
      addr?.bus_stop ||
      addr?.road ||
      addr?.suburb ||
      addr?.neighbourhood ||
      addr?.city_district ||
      `Stop at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch (_) {
    return `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

/**
 * Calculates compass heading (bearing in degrees 0-360) from p1 to p2.
 */
export function getBearing(p1: LatLng, p2: LatLng): number {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

