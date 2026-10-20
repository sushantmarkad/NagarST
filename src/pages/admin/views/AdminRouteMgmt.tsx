import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { getFirebaseRoutes, saveFirebaseRoute, deleteFirebaseRoute } from '../../../utils/firebaseService';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Plus,
  Trash2,
  MapPin,
  X,
  ArrowRight,
  Route as RouteIcon,
  Navigation,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  Flag,
  Target,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { createModernBusIcon } from '../../../components/map/busMarkerIcon';
import { fetchOSRMRoute, reverseGeocodeLatLng } from '../../../utils/routing';

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export const AdminRouteMgmt: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { buses: liveBuses, refreshData } = useApp();

  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [isCalculatingPath, setIsCalculatingPath] = useState(false);
  
  // Route creation state
  const [creationStep, setCreationStep] = useState<'idle' | 'selecting_origin' | 'selecting_destination' | 'filling_details'>('idle');
  const [creationPins, setCreationPins] = useState<{ origin?: L.LatLng; dest?: L.LatLng }>({});
  const [newRoute, setNewRoute] = useState({ routeNumber: '', origin: '', destination: '', name: '', color: '#7847CB' });
  
  // Route Edit state
  const [isEditRouteOpen, setIsEditRouteOpen] = useState(false);
  const [editRouteForm, setEditRouteForm] = useState({ routeNumber: '', origin: '', destination: '', name: '', color: '#7847CB' });

  // Stop addition state
  const [addingStopLoc, setAddingStopLoc] = useState<L.LatLng | null>(null);
  const [newStopName, setNewStopName] = useState('');

  // Stop editing state
  const [editingStop, setEditingStop] = useState<{ routeStopId: string; stopId: string; name: string } | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const syncLocalBackup = (routesList: any[]) => {
    try {
      localStorage.setItem('nagarst_configured_routes', JSON.stringify(routesList));
    } catch (_) {}
  };

  const fetchRoutes = async () => {
    let list: any[] = [];
    try {
      const fbRoutes = await getFirebaseRoutes();
      if (fbRoutes && fbRoutes.length > 0) {
        list = fbRoutes;
      }
    } catch (_) {}

    if (list.length === 0) {
      try {
        const { data, error } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          list = data;
        } else {
          const local = localStorage.getItem('nagarst_configured_routes');
          if (local) list = JSON.parse(local);
        }
      } catch {
        const local = localStorage.getItem('nagarst_configured_routes');
        if (local) list = JSON.parse(local);
      }
    }

    setRoutes(list);
    syncLocalBackup(list);

    if (list.length > 0) {
      setSelectedRoute((current: any) => {
        const match = current ? (list.find((r: any) => r.id === current.id) || list[0]) : list[0];
        if (match) {
          handleSelectRoute(match);
        }
        return match;
      });
    }
  };

  const handleSelectRoute = async (route: any) => {
    setSelectedRoute(route);
    setCreationStep('idle');
    setCreationPins({});
    
    // Fetch stops for route
    try {
      const { data } = await supabase
        .from('route_stops')
        .select(`
          id,
          stop_order,
          estimated_minutes_from_origin,
          stops (
            id,
            stop_name,
            lat,
            lng
          )
        `)
        .eq('route_id', route.id)
        .order('stop_order', { ascending: true });
      
      let resolvedStops: any[] = [];
      if (data && data.length > 0) {
        resolvedStops = [...data];
      } else if (route.stops && route.stops.length > 0) {
        // Format from route object
        resolvedStops = route.stops.map((s: any, idx: number) => ({
          id: s.id || `stop-${idx}`,
          stop_order: s.sequence || idx + 1,
          estimated_minutes_from_origin: s.estimatedMinutesFromOrigin || idx * 5,
          stops: {
            id: s.stopId || s.id || `stop-${idx}`,
            stop_name: s.stopName || s.name,
            lat: s.lat,
            lng: s.lng
          }
        }));
      }

      // If destination terminal was accidentally displaced before the last stop by an earlier stop addition,
      // re-anchor the destination stop strictly to the end!
      if (route.destination && resolvedStops.length > 2) {
        const destNorm = route.destination.trim().toLowerCase();
        const lastStopName = (resolvedStops[resolvedStops.length - 1]?.stops?.stop_name || '').trim().toLowerCase();
        const isMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
        if (!isMatch(lastStopName, destNorm)) {
          const destIdx = resolvedStops.findIndex(s => isMatch((s.stops?.stop_name || '').trim().toLowerCase(), destNorm));
          if (destIdx !== -1 && destIdx < resolvedStops.length - 1) {
            const destStop = resolvedStops.splice(destIdx, 1)[0];
            resolvedStops.push(destStop);
            resolvedStops.forEach((s, idx) => {
              s.stop_order = idx + 1;
              s.estimated_minutes_from_origin = idx * 4;
            });

            // Persist the corrected stop order into route_stops and re-calculate route_path
            try {
              for (const st of resolvedStops) {
                if (st.id) {
                  await supabase.from('route_stops').update({
                    stop_order: st.stop_order,
                    estimated_minutes_from_origin: st.estimated_minutes_from_origin
                  }).eq('id', st.id);
                }
              }
              const correctedPath = await fetchOSRMRoute(resolvedStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
              if (correctedPath.length >= 2) {
                await supabase.from('routes').update({ route_path: correctedPath }).eq('id', route.id);
                route.route_path = correctedPath;
              }
            } catch (_) {}
          }
        }
      }

      route.stops = resolvedStops.map((s, idx) => ({
        stopId: s.stops?.id || s.id,
        stopName: s.stops?.stop_name,
        lat: s.stops?.lat,
        lng: s.stops?.lng,
        sequence: idx + 1,
        estimatedMinutesFromOrigin: idx * 4
      }));

      setSelectedRoute({ ...route });
      setStops(resolvedStops);
    } catch {
      if (route.stops) {
        const fallbackStops = route.stops.map((s: any, idx: number) => ({
          id: s.id || `stop-${idx}`,
          stop_order: s.sequence || idx + 1,
          estimated_minutes_from_origin: s.estimatedMinutesFromOrigin || idx * 5,
          stops: {
            id: s.stopId || s.id || `stop-${idx}`,
            stop_name: s.stopName || s.name,
            lat: s.lat,
            lng: s.lng
          }
        }));

        if (route.destination && fallbackStops.length > 2) {
          const destNorm = route.destination.trim().toLowerCase();
          const lastStopName = (fallbackStops[fallbackStops.length - 1]?.stops?.stop_name || '').trim().toLowerCase();
          const isMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
          if (!isMatch(lastStopName, destNorm)) {
            const destIdx = fallbackStops.findIndex((s: any) => isMatch((s.stops?.stop_name || '').trim().toLowerCase(), destNorm));
            if (destIdx !== -1 && destIdx < fallbackStops.length - 1) {
              const destStop = fallbackStops.splice(destIdx, 1)[0];
              fallbackStops.push(destStop);
              fallbackStops.forEach((s: any, idx: number) => {
                s.stop_order = idx + 1;
                s.estimated_minutes_from_origin = idx * 4;
              });
            }
          }
        }
        route.stops = fallbackStops.map((s: any, idx: number) => ({
          stopId: s.stops?.id || s.id,
          stopName: s.stops?.stop_name,
          lat: s.stops?.lat,
          lng: s.stops?.lng,
          sequence: idx + 1,
          estimatedMinutesFromOrigin: idx * 4
        }));
        setSelectedRoute({ ...route });
        setStops(fallbackStops);
      }
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculatingPath(true);
    
    const routeId = `route-${Date.now()}`;
    const routeNum = newRoute.routeNumber.trim() || 'R-1';
    const originName = newRoute.origin.trim() || 'Start Terminal';
    const destName = newRoute.destination.trim() || 'End Terminal';
    const routeTitle = newRoute.name.trim() || `${originName} ➔ ${destName}`;
    const routeColor = newRoute.color || '#7847CB';

    let originStopId = `stop-origin-${Date.now()}`;
    let destStopId = `stop-dest-${Date.now()}`;
    const isDairy = destName.toLowerCase().includes('dairy') || destName.includes('डेअरी');
    const isOriginMaliwada = originName.toLowerCase().includes('maliwada') || originName.includes('माळीवाडा');

    const originCoords = creationPins.origin || (isOriginMaliwada ? { lat: 19.0910, lng: 74.7290 } : { lat: 19.0975, lng: 74.7420 });
    const destCoords = creationPins.dest || (isDairy ? { lat: 19.0830, lng: 74.7460 } : { lat: 19.1220, lng: 74.7350 });

    // Calculate real road path via OSRM turn-by-turn
    let roadPath: { lat: number; lng: number }[] = [];
    try {
      roadPath = await fetchOSRMRoute([
        { lat: originCoords.lat, lng: originCoords.lng },
        { lat: destCoords.lat, lng: destCoords.lng }
      ]);
    } catch (_) {}

    if (roadPath.length < 2) {
      roadPath = [
        { lat: originCoords.lat, lng: originCoords.lng },
        { lat: destCoords.lat, lng: destCoords.lng }
      ];
    }

    let finalRouteId = routeId;

    // Insert into Supabase (omit id to let Supabase generate a valid UUID)
    try {
      const { data: routeData, error } = await supabase.from('routes').insert([{
        route_number: routeNum,
        origin: originName,
        destination: destName,
        route_path: roadPath
      }]).select().single();

      if (!error && routeData) {
        finalRouteId = routeData.id;
        // Insert origin and dest stops
        const { data: oStop } = await supabase.from('stops').insert([{
          stop_name: originName,
          lat: originCoords.lat,
          lng: originCoords.lng,
          location: `POINT(${originCoords.lng} ${originCoords.lat})`
        }]).select().single();
        if (oStop) originStopId = oStop.id;

        const { data: dStop } = await supabase.from('stops').insert([{
          stop_name: destName,
          lat: destCoords.lat,
          lng: destCoords.lng,
          location: `POINT(${destCoords.lng} ${destCoords.lat})`
        }]).select().single();
        if (dStop) destStopId = dStop.id;

        await supabase.from('route_stops').insert([
          { route_id: finalRouteId, stop_id: originStopId, stop_order: 1, estimated_minutes_from_origin: 0 },
          { route_id: finalRouteId, stop_id: destStopId, stop_order: 2, estimated_minutes_from_origin: 25 }
        ]);
      }
    } catch (_) {}

    // Save also into local configured routes
    const newRouteObj = {
      id: finalRouteId,
      routeNumber: routeNum,
      route_number: routeNum,
      name: routeTitle,
      origin: originName,
      destination: destName,
      color: routeColor,
      route_path: roadPath,
      stops: [
        { stopId: originStopId, stopName: originName, lat: originCoords.lat, lng: originCoords.lng, sequence: 1, estimatedMinutesFromOrigin: 0 },
        { stopId: destStopId, stopName: destName, lat: destCoords.lat, lng: destCoords.lng, sequence: 2, estimatedMinutesFromOrigin: 25 }
      ]
    };

    // Save also to Firebase Firestore
    try {
      await saveFirebaseRoute(newRouteObj);
    } catch (fbErr) {
      console.warn('Firebase save route notice:', fbErr);
    }

    const updatedRoutes = [newRouteObj, ...routes.filter(r => r.id !== finalRouteId && r.id !== routeId)];
    setRoutes(updatedRoutes);
    syncLocalBackup(updatedRoutes);
    setSelectedRoute(newRouteObj);
    setStops([
      { id: `rs-1`, stop_order: 1, estimated_minutes_from_origin: 0, stops: { id: originStopId, stop_name: originName, lat: originCoords.lat, lng: originCoords.lng } },
      { id: `rs-2`, stop_order: 2, estimated_minutes_from_origin: 25, stops: { id: destStopId, stop_name: destName, lat: destCoords.lat, lng: destCoords.lng } }
    ]);

    setIsCalculatingPath(false);
    toast.success(`Route ${routeNum} created with real road path and terminal anchors!`, 'Route Created');
    setCreationStep('idle');
    setCreationPins({});
    setNewRoute({ routeNumber: '', origin: '', destination: '', name: '', color: '#7847CB' });
    
    await refreshData();
  };

  const openEditRouteModal = () => {
    if (!selectedRoute) return;
    setEditRouteForm({
      routeNumber: selectedRoute.route_number || selectedRoute.routeNumber || '',
      origin: selectedRoute.origin || '',
      destination: selectedRoute.destination || '',
      name: selectedRoute.name || '',
      color: selectedRoute.color || '#7847CB'
    });
    setIsEditRouteOpen(true);
  };

  const handleSaveRouteEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    const updated = {
      ...selectedRoute,
      route_number: editRouteForm.routeNumber.trim(),
      routeNumber: editRouteForm.routeNumber.trim(),
      origin: editRouteForm.origin.trim(),
      destination: editRouteForm.destination.trim(),
      name: editRouteForm.name.trim() || `${editRouteForm.origin} ➔ ${editRouteForm.destination}`,
      color: editRouteForm.color
    };

    try {
      await supabase.from('routes').update({
        route_number: updated.route_number,
        origin: updated.origin,
        destination: updated.destination
      }).eq('id', selectedRoute.id);
    } catch (_) {}

    const updatedList = routes.map(r => r.id === selectedRoute.id ? updated : r);
    setRoutes(updatedList);
    setSelectedRoute(updated);
    syncLocalBackup(updatedList);
    setIsEditRouteOpen(false);
    toast.success(`Route ${updated.routeNumber} details updated!`);
    await refreshData();
  };

  const handleMapClick = async (latlng: L.LatLng) => {
    if (creationStep === 'selecting_origin') {
      setCreationPins(prev => ({ ...prev, origin: latlng }));
      const name = await reverseGeocodeLatLng(latlng.lat, latlng.lng);
      setNewRoute(prev => ({ ...prev, origin: name }));
      setCreationStep('selecting_destination');
      toast.info(`Origin set to: ${name}. Now click map to place Destination pin.`);
    } else if (creationStep === 'selecting_destination') {
      setCreationPins(prev => ({ ...prev, dest: latlng }));
      const name = await reverseGeocodeLatLng(latlng.lat, latlng.lng);
      setNewRoute(prev => ({ ...prev, destination: name }));
      setCreationStep('filling_details');
    } else if (selectedRoute && creationStep === 'idle') {
      setAddingStopLoc(latlng);
      const name = await reverseGeocodeLatLng(latlng.lat, latlng.lng);
      setNewStopName(name);
    }
  };

  const saveNewStop = async () => {
    if (!addingStopLoc || !selectedRoute || !newStopName.trim()) return;

    setIsCalculatingPath(true);
    const stopId = `stop-${Date.now()}`;
    const newStopItem = {
      id: `rs-${Date.now()}`,
      stop_order: 1,
      estimated_minutes_from_origin: 0,
      stops: {
        id: stopId,
        stop_name: newStopName.trim(),
        lat: addingStopLoc.lat,
        lng: addingStopLoc.lng
      }
    };

    // Calculate optimal intermediate insertion index:
    // Stops should be inserted between Start Terminal (index 0) and End Terminal (index stops.length - 1)
    let insertIndex = 1;
    if (stops.length <= 1) {
      insertIndex = stops.length;
    } else {
      // Find the segment [i, i+1] that minimizes the detour distance
      let minDetour = Infinity;
      const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      for (let i = 0; i < stops.length - 1; i++) {
        const s1 = stops[i]?.stops;
        const s2 = stops[i + 1]?.stops;
        if (!s1 || !s2) continue;
        const dist1 = getDist(s1.lat, s1.lng, addingStopLoc.lat, addingStopLoc.lng);
        const dist2 = getDist(addingStopLoc.lat, addingStopLoc.lng, s2.lat, s2.lng);
        const direct = getDist(s1.lat, s1.lng, s2.lat, s2.lng);
        const detour = dist1 + dist2 - direct;
        if (detour < minDetour) {
          minDetour = detour;
          insertIndex = i + 1;
        }
      }

      // Safeguard: Never replace Start Terminal (index 0) or push past End Terminal (index stops.length - 1)
      insertIndex = Math.max(1, Math.min(insertIndex, stops.length - 1));
    }

    const updatedStops = [
      ...stops.slice(0, insertIndex),
      newStopItem,
      ...stops.slice(insertIndex)
    ];

    // Ensure Destination Terminal remains strictly at the last index
    if (selectedRoute.destination && updatedStops.length > 2) {
      const destNorm = selectedRoute.destination.trim().toLowerCase();
      const lastStopName = (updatedStops[updatedStops.length - 1]?.stops?.stop_name || '').trim().toLowerCase();
      const isMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
      if (!isMatch(lastStopName, destNorm)) {
        const dIdx = updatedStops.findIndex(s => isMatch((s.stops?.stop_name || '').trim().toLowerCase(), destNorm));
        if (dIdx !== -1 && dIdx < updatedStops.length - 1) {
          const destStop = updatedStops.splice(dIdx, 1)[0];
          updatedStops.push(destStop);
        }
      }
    }

    // Re-index all stop_order and estimated_minutes_from_origin
    updatedStops.forEach((s, idx) => {
      s.stop_order = idx + 1;
      s.estimated_minutes_from_origin = idx * 4;
    });

    // Compute updated OSRM road path through all stops in sequence
    let path: { lat: number; lng: number }[] = [];
    try {
      path = await fetchOSRMRoute(updatedStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
    } catch (_) {}

    if (path.length < 2) {
      path = updatedStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng }));
    }

    try {
      // 1. Create stop in DB
      const { data: stopData } = await supabase.from('stops').insert([{
        stop_name: newStopName.trim(),
        lat: addingStopLoc.lat,
        lng: addingStopLoc.lng,
        location: `POINT(${addingStopLoc.lng} ${addingStopLoc.lat})`
      }]).select().single();

      const createdStopId = stopData?.id || stopId;
      newStopItem.stops.id = createdStopId;

      // 2. Link to route_stops at computed intermediate stop_order
      const { data: rsRow } = await supabase.from('route_stops').insert([{
        route_id: selectedRoute.id,
        stop_id: createdStopId,
        stop_order: insertIndex + 1,
        estimated_minutes_from_origin: insertIndex * 4
      }]).select().single();

      if (rsRow?.id) {
        newStopItem.id = rsRow.id;
      }

      // 3. Update stop_order for all subsequent stops in route_stops
      for (let i = 0; i < updatedStops.length; i++) {
        const st = updatedStops[i];
        if (st.id && st.id !== newStopItem.id) {
          await supabase.from('route_stops').update({
            stop_order: st.stop_order,
            estimated_minutes_from_origin: st.estimated_minutes_from_origin
          }).eq('id', st.id);
        }
      }

      // 4. Update route_path in routes table
      await supabase.from('routes').update({ route_path: path }).eq('id', selectedRoute.id);
    } catch (err) {
      console.warn('DB update error in saveNewStop:', err);
    }

    const updatedRouteObj = {
      ...selectedRoute,
      route_path: path,
      stops: updatedStops.map((s, i) => ({
        stopId: s.stops.id,
        stopName: s.stops.stop_name,
        lat: s.stops.lat,
        lng: s.stops.lng,
        sequence: i + 1,
        estimatedMinutesFromOrigin: i * 4
      }))
    };

    // Save to Firebase Firestore
    try {
      await saveFirebaseRoute(updatedRouteObj);
    } catch (fbErr) {
      console.warn('Firebase save updated route stops notice:', fbErr);
    }

    const updatedList = routes.map(r => r.id === selectedRoute.id ? updatedRouteObj : r);
    setRoutes(updatedList);
    setSelectedRoute(updatedRouteObj);
    setStops(updatedStops);
    syncLocalBackup(updatedList);

    setAddingStopLoc(null);
    setNewStopName('');
    setIsCalculatingPath(false);
    toast.success(`Stop "${newStopName}" added between terminals and snapped along road!`);
    await refreshData();
  };

  // Reorder Stops (Move Up / Move Down)
  const handleMoveStop = async (index: number, direction: 'up' | 'down') => {
    if (!selectedRoute) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    // Disallow swapping into terminal positions 0 or stops.length - 1
    if (targetIndex < 1 || targetIndex >= stops.length - 1) return;

    setIsCalculatingPath(true);
    const reordered = [...stops];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Update sequence orders
    reordered.forEach((s, idx) => {
      s.stop_order = idx + 1;
      s.estimated_minutes_from_origin = idx * 4;
    });

    // Recompute road path via OSRM with new stop sequence
    let path: { lat: number; lng: number }[] = [];
    try {
      path = await fetchOSRMRoute(reordered.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
    } catch (_) {}

    if (path.length < 2) {
      path = reordered.map(s => ({ lat: s.stops.lat, lng: s.stops.lng }));
    }

    try {
      // Update route_stops orders in DB
      for (const st of reordered) {
        await supabase.from('route_stops').update({
          stop_order: st.stop_order,
          estimated_minutes_from_origin: st.estimated_minutes_from_origin
        }).eq('id', st.id);
      }
      await supabase.from('routes').update({ route_path: path }).eq('id', selectedRoute.id);
    } catch (_) {}

    const updatedRouteObj = {
      ...selectedRoute,
      route_path: path,
      stops: reordered.map((s, i) => ({
        stopId: s.stops.id,
        stopName: s.stops.stop_name,
        lat: s.stops.lat,
        lng: s.stops.lng,
        sequence: i + 1,
        estimatedMinutesFromOrigin: i * 4
      }))
    };

    // Save to Firebase Firestore
    try {
      await saveFirebaseRoute(updatedRouteObj);
    } catch (_) {}

    const updatedList = routes.map(r => r.id === selectedRoute.id ? updatedRouteObj : r);
    setRoutes(updatedList);
    setSelectedRoute(updatedRouteObj);
    setStops(reordered);
    syncLocalBackup(updatedList);

    setIsCalculatingPath(false);
    toast.success('Stops reordered! Road route snapped to new stop order.');
    await refreshData();
  };

  // Edit Stop Name
  const handleSaveStopName = async () => {
    if (!editingStop || !editingStop.name.trim() || !selectedRoute) return;

    try {
      await supabase.from('stops').update({
        stop_name: editingStop.name.trim()
      }).eq('id', editingStop.stopId);
    } catch (_) {}

    const updatedStops = stops.map(s => {
      if (s.id === editingStop.routeStopId) {
        return {
          ...s,
          stops: { ...s.stops, stop_name: editingStop.name.trim() }
        };
      }
      return s;
    });

    setStops(updatedStops);
    setEditingStop(null);
    toast.success('Stop name updated.');
    await refreshData();
  };

  const removeStop = async (routeStopId: string, stopName: string) => {
    if (!selectedRoute) return;

    const stopIndex = stops.findIndex(s => s.id === routeStopId);
    if (stopIndex === 0 || stopIndex === stops.length - 1) {
      toast.error('Corridor origin and destination terminals cannot be deleted.');
      return;
    }

    const isConfirmed = await confirm({
      title: `Remove stop ${stopName}?`,
      message: `Are you sure you want to remove this stop from Route ${selectedRoute?.route_number}?`,
      confirmText: 'Remove Stop',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    setIsCalculatingPath(true);
    try {
      await supabase.from('route_stops').delete().eq('id', routeStopId);
    } catch (_) {}
    
    const remainingStops = stops.filter(s => s.id !== routeStopId);
    let path: { lat: number; lng: number }[] = [];
    if (remainingStops.length >= 2) {
      try {
        path = await fetchOSRMRoute(remainingStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
      } catch (_) {}
      if (path.length < 2) {
        path = remainingStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng }));
      }
    }

    try {
      await supabase.from('routes').update({ route_path: path }).eq('id', selectedRoute.id);
    } catch (_) {}

    const updatedRouteObj = {
      ...selectedRoute,
      route_path: path,
      stops: remainingStops.map((s, i) => ({
        stopId: s.stops.id,
        stopName: s.stops.stop_name,
        lat: s.stops.lat,
        lng: s.stops.lng,
        sequence: i + 1,
        estimatedMinutesFromOrigin: i * 4
      }))
    };

    // Save to Firebase Firestore
    try {
      await saveFirebaseRoute(updatedRouteObj);
    } catch (_) {}

    const updatedList = routes.map(r => r.id === selectedRoute.id ? updatedRouteObj : r);
    setRoutes(updatedList);
    setSelectedRoute(updatedRouteObj);
    setStops(remainingStops);
    syncLocalBackup(updatedList);

    setIsCalculatingPath(false);
    toast.info(`Stop removed from route.`);
    await refreshData();
  };

  const handleDeleteRoute = async (routeId: string, routeNumber: string) => {
    const isConfirmed = await confirm({
      title: `Delete Route ${routeNumber}?`,
      message: `Are you sure you want to delete this route? This will permanently delete all associated trips, schedule records, and stop assignments.`,
      confirmText: 'Delete Route',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    // Delete from Firebase Firestore
    try {
      await deleteFirebaseRoute(routeId);
    } catch (fbErr) {
      console.warn('Firebase delete route notice:', fbErr);
    }

    try {
      // Find stops belonging to this route before deleting route_stops
      const { data: routeStopRows } = await supabase.from('route_stops').select('stop_id').eq('route_id', routeId);
      const stopIds = (routeStopRows || []).map((r: any) => r.stop_id).filter(Boolean);

      await supabase.from('trips').delete().eq('route_id', routeId);
      await supabase.from('route_stops').delete().eq('route_id', routeId);
      await supabase.from('routes').delete().eq('id', routeId);

      // Permanently remove any orphaned stops not used by any remaining route
      for (const sId of stopIds) {
        const { count } = await supabase.from('route_stops').select('*', { count: 'exact', head: true }).eq('stop_id', sId);
        if (!count || count === 0) {
          await supabase.from('stops').delete().eq('id', sId);
        }
      }
    } catch (_) {}

    const updatedList = routes.filter(r => r.id !== routeId && r.routeNumber !== routeNumber && r.route_number !== routeNumber);
    setRoutes(updatedList);
    syncLocalBackup(updatedList);
    setSelectedRoute(null);
    setStops([]);

    try {
      const raw = localStorage.getItem('nagarst_demo_assignments');
      if (raw) {
        const assignments = JSON.parse(raw);
        Object.keys(assignments).forEach(k => {
          if (assignments[k]?.routeId === routeId || assignments[k]?.routeNumber === routeNumber) {
            delete assignments[k];
          }
        });
        localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
      }
      if (updatedList.length === 0) {
        localStorage.removeItem('nagarst_configured_routes');
        localStorage.removeItem('nagarst_demo_assignments');
      }
    } catch (_) {}

    toast.success(`Route ${routeNumber} deleted.`);
    await refreshData();
  };

  const handleDeleteAllRoutes = async () => {
    const isConfirmed = await confirm({
      title: 'Delete All Configured Routes?',
      message: 'This will permanently delete all transit routes and stop assignments from the database and maps.',
      confirmText: 'Delete All Routes',
      isDestructive: true,
    });
    if (!isConfirmed) return;

    try {
      await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('route_stops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('routes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (_) {}

    try {
      localStorage.removeItem('nagarst_configured_routes');
      localStorage.removeItem('nagarst_demo_assignments');
    } catch (_) {}

    setRoutes([]);
    syncLocalBackup([]);
    setSelectedRoute(null);
    setStops([]);
    toast.success('All routes deleted.');
    await refreshData();
  };

  const activeBusesForRoute = selectedRoute 
    ? liveBuses.filter(b => b.routeId === selectedRoute.id)
    : [];

  const routePositions: [number, number][] = selectedRoute?.route_path && selectedRoute.route_path.length > 0
    ? selectedRoute.route_path.map((p: any) => [p.lat, p.lng])
    : stops.map(s => [s.stops.lat, s.stops.lng]);

  const getBusIcon = (busNumber: string) => {
    return createModernBusIcon(busNumber, { isSelected: true });
  };

  const stopIcon = L.divIcon({
    className: 'custom-stop-icon',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background-color: #ffffff;
        border: 3px solid #7847CB;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const startPinIcon = L.divIcon({
    className: 'custom-start-pin',
    html: `
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #059669; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  const endPinIcon = L.divIcon({
    className: 'custom-end-pin',
    html: `
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #e11d48; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#f8f9fc] relative">
      
      {/* Route Creation Confirmation Modal */}
      <Modal
        isOpen={creationStep === 'filling_details'}
        onClose={() => {
          setCreationStep('idle');
          setCreationPins({});
        }}
        title="Confirm New Route Corridor"
        description="Verify corridor code and origin/destination names"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRoute} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Route Identifier (e.g. Route 12 or AH-01)</label>
            <input
              required
              type="text"
              value={newRoute.routeNumber}
              onChange={e => setNewRoute({...newRoute, routeNumber: e.target.value})}
              placeholder="e.g. Route 12"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#7847CB]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Route Full Name</label>
            <input
              type="text"
              value={newRoute.name}
              onChange={e => setNewRoute({...newRoute, name: e.target.value})}
              placeholder="e.g. Savedi - Central Bus Stand Express"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Origin Terminal</label>
              <input
                required
                type="text"
                value={newRoute.origin}
                onChange={e => setNewRoute({...newRoute, origin: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination Terminal</label>
              <input
                required
                type="text"
                value={newRoute.destination}
                onChange={e => setNewRoute({...newRoute, destination: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreationStep('idle');
                setCreationPins({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isCalculatingPath}>
              Save & Snap Road Path
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Route Details Modal */}
      <Modal
        isOpen={isEditRouteOpen}
        onClose={() => setIsEditRouteOpen(false)}
        title="Edit Route Corridor Details"
        description="Update route code, name, origin, or destination"
        maxWidth="md"
      >
        <form onSubmit={handleSaveRouteEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Route Identifier</label>
            <input
              required
              type="text"
              value={editRouteForm.routeNumber}
              onChange={e => setEditRouteForm({...editRouteForm, routeNumber: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#7847CB]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Route Title</label>
            <input
              type="text"
              value={editRouteForm.name}
              onChange={e => setEditRouteForm({...editRouteForm, name: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Origin Terminal</label>
              <input
                required
                type="text"
                value={editRouteForm.origin}
                onChange={e => setEditRouteForm({...editRouteForm, origin: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination Terminal</label>
              <input
                required
                type="text"
                value={editRouteForm.destination}
                onChange={e => setEditRouteForm({...editRouteForm, destination: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditRouteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stop Modal Triggered from Map Click */}
      <Modal
        isOpen={!!addingStopLoc}
        onClose={() => setAddingStopLoc(null)}
        title="Add Bus Stop to Route"
        description="Name the newly clicked road coordinate"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <input 
              autoFocus
              placeholder="e.g. Ananddham Chowk" 
              type="text" 
              value={newStopName} 
              onChange={e => setNewStopName(e.target.value)} 
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#7847CB]" 
            />
          </div>
          {addingStopLoc && (
            <div className="text-[10px] text-slate-400 font-mono">
              Road Location: {addingStopLoc.lat.toFixed(5)}, {addingStopLoc.lng.toFixed(5)}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddingStopLoc(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveNewStop} disabled={!newStopName.trim()} loading={isCalculatingPath}>
              Add Stop & Snap Path
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Stop Modal */}
      {editingStop && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStop(null)}
          title="Edit Stop Name"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={editingStop.name}
              onChange={e => setEditingStop({ ...editingStop, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#7847CB]"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingStop(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveStopName}>
                Save Name
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Side Panel: Routes List & Stops Directory */}
      <div className="w-full lg:w-96 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-slate-200/90 lg:h-full h-auto overflow-y-auto shrink-0 shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Routes & Corridors</h3>
            <span className="text-[10px] text-slate-500 font-medium">{routes.length} Configured Routes</span>
          </div>
          <div className="flex items-center gap-1.5">
            {routes.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAllRoutes}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setCreationStep('selecting_origin');
                toast.info('Click anywhere on the map to set Origin Terminal pin.');
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Route
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Active Routes */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
              Configured Transit Routes
            </span>

            {routes.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                <RouteIcon className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No Routes Configured Yet</p>
                <p className="text-[11px]">Click "New Route" to define start & end terminal pins directly on the map.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {routes.map((r) => {
                  const isSelected = selectedRoute?.id === r.id;
                  const rNum = r.route_number || r.routeNumber || 'R';
                  return (
                    <div key={r.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => handleSelectRoute(r)}
                        className={`w-full p-3 rounded-2xl text-left transition-all text-xs pr-16 border ${
                          isSelected
                            ? 'bg-purple-50/80 border-[#7847CB] shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            isSelected ? 'bg-[#7847CB] text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rNum}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {r.origin} ➔ {r.destination}
                          </span>
                        </div>
                        {r.name && r.name !== `${r.origin} ➔ ${r.destination}` && (
                          <div className="text-[11px] text-slate-500 truncate pl-0.5">{r.name}</div>
                        )}
                      </button>

                      {isSelected && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRouteModal();
                            }}
                            className="p-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                            title="Edit Route Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoute(r.id, rNum);
                            }}
                            className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Delete Route"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stops for Selected Route */}
          {selectedRoute && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ordered Stops ({stops.length})
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">Click road map to add stop</span>
              </div>

              {isCalculatingPath && (
                <div className="p-2 rounded-xl bg-purple-50 text-purple-800 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  <span>Calculating road curve through stops...</span>
                </div>
              )}

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {stops.map((routeStop, i) => {
                  const isFirst = i === 0;
                  const isLast = i === stops.length - 1;

                  return (
                    <div key={routeStop.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-5 h-5 rounded-lg font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          isFirst ? 'bg-emerald-600 text-white' : isLast ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-slate-800 truncate block">
                            {routeStop.stops.stop_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {isFirst ? 'Start Terminal' : isLast ? 'End Terminal' : `+${routeStop.estimated_minutes_from_origin || i * 4}m`}
                          </span>
                        </div>
                      </div>

                      {/* Reorder and Action Buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={i <= 1 || isLast}
                          onClick={() => handleMoveStop(i, 'up')}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 disabled:hover:bg-transparent"
                          title={i <= 1 ? 'Cannot move above Start Terminal' : 'Move stop up'}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i >= stops.length - 2 || isFirst}
                          onClick={() => handleMoveStop(i, 'down')}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 disabled:hover:bg-transparent"
                          title={i >= stops.length - 2 ? 'Cannot move below End Terminal' : 'Move stop down'}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStop({
                            routeStopId: routeStop.id,
                            stopId: routeStop.stops.id,
                            name: routeStop.stops.stop_name
                          })}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          title="Rename stop"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isFirst || isLast}
                          onClick={() => removeStop(routeStop.id, routeStop.stops.stop_name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-20 disabled:hover:text-slate-400"
                          title={isFirst || isLast ? 'Cannot remove corridor terminal' : 'Remove stop'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 h-[55vh] lg:h-full relative z-0">
        <MapContainer 
          center={[19.0952, 74.7396]} 
          zoom={13} 
          className="w-full h-full absolute inset-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {routePositions.length > 1 && (
            <Polyline positions={routePositions} color={selectedRoute?.color || '#7847CB'} weight={5} opacity={0.85} />
          )}

          {stops.map((rs, i) => {
            const isFirst = i === 0;
            const isLast = i === stops.length - 1;
            const icon = isFirst ? startPinIcon : isLast ? endPinIcon : stopIcon;

            return (
              <Marker key={rs.id} position={[rs.stops.lat, rs.stops.lng]} icon={icon}>
                <Popup>
                  <div className="font-bold text-xs">
                    <div>{i + 1}. {rs.stops.stop_name}</div>
                    <div className="text-[10px] text-slate-500">{isFirst ? 'Start Terminal' : isLast ? 'End Terminal' : `Stop #${i + 1}`}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {activeBusesForRoute.map(bus => (
            <Marker key={bus.id} position={[bus.lat, bus.lng]} icon={getBusIcon(bus.busNumber)}>
              <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip">
                <div className="text-center font-bold text-xs">
                  <div>{bus.busNumber}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{bus.speedKmh} km/h • {bus.status}</div>
                </div>
              </Tooltip>
            </Marker>
          ))}

          {creationPins.origin && (
            <Marker position={[creationPins.origin.lat, creationPins.origin.lng]} icon={startPinIcon}>
              <Popup>Selected Origin Terminal</Popup>
            </Marker>
          )}
          {creationPins.dest && (
            <Marker position={[creationPins.dest.lat, creationPins.dest.lng]} icon={endPinIcon}>
              <Popup>Selected Destination Terminal</Popup>
            </Marker>
          )}
        </MapContainer>
        
        {creationStep !== 'idle' && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl z-[1000] border border-purple-200 animate-in fade-in">
            <p className="text-xs font-bold text-[#7847CB] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7847CB] animate-ping" />
              {creationStep === 'selecting_origin' ? 'Click anywhere on road map to drop Start Terminal pin' : 'Click road map to drop End Terminal pin'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
