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

/**
 * Fetches the snapped road path (polyline) from OSRM given an array of stops.
 */
export async function fetchOSRMRoute(stops: LatLng[]): Promise<LatLng[]> {
  if (stops.length < 2) return [];

  // OSRM format: lng,lat;lng,lat
  const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const geojsonPath = data.routes[0].geometry.coordinates;
      // GeoJSON is [lng, lat], we need [lat, lng] for Leaflet
      return geojsonPath.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return [];
  }
}
