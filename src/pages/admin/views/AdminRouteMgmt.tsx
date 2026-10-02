import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Plus, Trash2, MapPin, X, ArrowRight, Route as RouteIcon, Navigation } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';

// Helper to calculate routing polyline via OpenStreetMap OSRM
async function fetchOSRMRoute(coordinates: { lat: number; lng: number }[]) {
  if (coordinates.length < 2) return [];
  const coordsString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => ({
        lat: c[1],
        lng: c[0]
      }));
    }
  } catch (e) {
    console.error('OSRM fetch failed', e);
  }
  return [];
}

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
  const { buses: liveBuses } = useApp();

  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  
  // Route creation state
  const [creationStep, setCreationStep] = useState<'idle' | 'selecting_origin' | 'selecting_destination' | 'filling_details'>('idle');
  const [creationPins, setCreationPins] = useState<{ origin?: L.LatLng; dest?: L.LatLng }>({});
  const [newRoute, setNewRoute] = useState({ routeNumber: '', origin: '', destination: '' });
  
  // Stop addition state
  const [addingStopLoc, setAddingStopLoc] = useState<L.LatLng | null>(null);
  const [newStopName, setNewStopName] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (data) setRoutes(data);
  };

  const handleSelectRoute = async (route: any) => {
    setSelectedRoute(route);
    setCreationStep('idle');
    setCreationPins({});
    
    // Fetch stops
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
    
    if (data) setStops(data);
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create the Route
    const { data: routeData, error } = await supabase.from('routes').insert([{
      route_number: newRoute.routeNumber.trim(),
      origin: newRoute.origin.trim(),
      destination: newRoute.destination.trim()
    }]).select().single();

    if (error || !routeData) {
      toast.error(`Error creating route: ${error?.message || 'Unknown error'}`);
      return;
    }

    let originStopId: string | null = null;
    let destStopId: string | null = null;

    // 2. Automatically create stops for Origin and Destination if pins were dropped
    if (creationPins.origin) {
      const { data: originStop } = await supabase.from('stops').insert([{
        stop_name: newRoute.origin,
        lat: creationPins.origin.lat,
        lng: creationPins.origin.lng,
        location: `POINT(${creationPins.origin.lng} ${creationPins.origin.lat})`
      }]).select().single();
      if (originStop) originStopId = originStop.id;
    }

    if (creationPins.dest) {
      const { data: destStop } = await supabase.from('stops').insert([{
        stop_name: newRoute.destination,
        lat: creationPins.dest.lat,
        lng: creationPins.dest.lng,
        location: `POINT(${creationPins.dest.lng} ${creationPins.dest.lat})`
      }]).select().single();
      if (destStop) destStopId = destStop.id;
    }

    // 3. Link stops to route_stops
    if (originStopId) {
      await supabase.from('route_stops').insert([{
        route_id: routeData.id,
        stop_id: originStopId,
        stop_order: 1,
        estimated_minutes_from_origin: 0
      }]);
    }

    if (destStopId) {
      await supabase.from('route_stops').insert([{
        route_id: routeData.id,
        stop_id: destStopId,
        stop_order: 2,
        estimated_minutes_from_origin: 30
      }]);
    }

    // 4. Calculate OSRM route path geometry
    if (creationPins.origin && creationPins.dest) {
      const path = await fetchOSRMRoute([
        { lat: creationPins.origin.lat, lng: creationPins.origin.lng },
        { lat: creationPins.dest.lat, lng: creationPins.dest.lng }
      ]);
      await supabase.from('routes').update({ route_path: path }).eq('id', routeData.id);
    }

    toast.success(`Route ${newRoute.routeNumber} established successfully!`);
    setCreationStep('idle');
    setCreationPins({});
    setNewRoute({ routeNumber: '', origin: '', destination: '' });
    fetchRoutes();
  };

  const handleMapClick = async (latlng: L.LatLng) => {
    if (creationStep === 'selecting_origin') {
      setCreationPins(prev => ({ ...prev, origin: latlng }));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
        const data = await res.json();
        const name = data.address?.road || data.address?.suburb || 'Selected Origin';
        setNewRoute(prev => ({ ...prev, origin: name }));
      } catch {
        setNewRoute(prev => ({ ...prev, origin: 'Custom Origin' }));
      }
      setCreationStep('selecting_destination');
    } else if (creationStep === 'selecting_destination') {
      setCreationPins(prev => ({ ...prev, dest: latlng }));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
        const data = await res.json();
        const name = data.address?.road || data.address?.suburb || 'Selected Destination';
        setNewRoute(prev => ({ ...prev, destination: name }));
      } catch {
        setNewRoute(prev => ({ ...prev, destination: 'Custom Destination' }));
      }
      setCreationStep('filling_details');
    } else if (selectedRoute && creationStep === 'idle') {
      setAddingStopLoc(latlng);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
        const data = await res.json();
        const name = data.address?.road || data.address?.suburb || '';
        setNewStopName(name);
      } catch {
        setNewStopName('');
      }
    }
  };

  const saveNewStop = async () => {
    if (!addingStopLoc || !selectedRoute || !newStopName.trim()) return;

    // 1. Create stop
    const { data: stopData, error: stopErr } = await supabase.from('stops').insert([{
      stop_name: newStopName.trim(),
      lat: addingStopLoc.lat,
      lng: addingStopLoc.lng,
      location: `POINT(${addingStopLoc.lng} ${addingStopLoc.lat})`
    }]).select().single();

    if (stopErr) {
      toast.error(stopErr.message);
      return;
    }

    // 2. Link to route
    const { error: linkErr } = await supabase.from('route_stops').insert([{
      route_id: selectedRoute.id,
      stop_id: stopData.id,
      stop_order: stops.length + 1,
      estimated_minutes_from_origin: (stops.length + 1) * 5
    }]);

    if (!linkErr) {
      setAddingStopLoc(null);
      setNewStopName('');
      toast.success(`Stop "${newStopName}" added to Route ${selectedRoute.route_number}!`);
      
      // Update OSRM route path
      const allStops = [...stops, { stops: { lat: stopData.lat, lng: stopData.lng } }];
      const path = await fetchOSRMRoute(allStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
      await supabase.from('routes').update({ route_path: path }).eq('id', selectedRoute.id);
      
      handleSelectRoute(selectedRoute); // refresh stops
    }
  };

  const removeStop = async (routeStopId: string, stopName: string) => {
    const isConfirmed = await confirm({
      title: `Remove stop ${stopName}?`,
      message: `Are you sure you want to remove this stop from Route ${selectedRoute?.route_number}?`,
      confirmText: 'Remove Stop',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    await supabase.from('route_stops').delete().eq('id', routeStopId);
    toast.info(`Stop removed from route.`);
    
    // Update OSRM route path
    const remainingStops = stops.filter(s => s.id !== routeStopId);
    if (remainingStops.length >= 2) {
      const path = await fetchOSRMRoute(remainingStops.map(s => ({ lat: s.stops.lat, lng: s.stops.lng })));
      await supabase.from('routes').update({ route_path: path }).eq('id', selectedRoute.id);
    } else {
      await supabase.from('routes').update({ route_path: [] }).eq('id', selectedRoute.id);
    }
    
    handleSelectRoute(selectedRoute); // refresh stops
  };

  const handleDeleteRoute = async (routeId: string, routeNumber: string) => {
    const isConfirmed = await confirm({
      title: `Delete Route ${routeNumber}?`,
      message: `Are you sure you want to delete this route? This will permanently delete all associated trips, schedule records, and stop assignments.`,
      confirmText: 'Delete Route',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('routes').delete().eq('id', routeId);
      if (error) throw error;
      toast.success(`Route ${routeNumber} deleted.`);
      setSelectedRoute(null);
      setStops([]);
      fetchRoutes();
    } catch (err: any) {
      toast.error(`Error deleting route: ${err.message}`);
    }
  };

  const activeBusesForRoute = selectedRoute 
    ? liveBuses.filter(b => b.routeId === selectedRoute.id)
    : [];

  const routePositions: [number, number][] = selectedRoute?.route_path && selectedRoute.route_path.length > 0
    ? selectedRoute.route_path.map((p: any) => [p.lat, p.lng])
    : stops.map(s => [s.stops.lat, s.stops.lng]);

  const getBusIcon = (busNumber: string) => {
    return L.divIcon({
      className: 'custom-bus-icon',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: #7847CB;
          color: white;
          font-weight: 800;
          font-size: 11px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          border: 2px solid white;
          white-space: nowrap;
        ">
          <span>🚌</span>
          <span>${busNumber}</span>
        </div>
      `,
      iconSize: [60, 26],
      iconAnchor: [30, 13],
    });
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

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#f8f9fc] relative">
      
      {/* Route Creation Confirmation Modal */}
      <Modal
        isOpen={creationStep === 'filling_details'}
        onClose={() => {
          setCreationStep('idle');
          setCreationPins({});
        }}
        title="Confirm New Route Details"
        description="Verify corridor code and origin/destination names"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRoute} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Route Identifier (e.g. R-12)</label>
            <input
              required
              type="text"
              value={newRoute.routeNumber}
              onChange={e => setNewRoute({...newRoute, routeNumber: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#7847CB]"
            />
          </div>
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
            <Button type="submit" size="sm">
              Save Transit Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stop Modal Triggered from Map Click */}
      <Modal
        isOpen={!!addingStopLoc}
        onClose={() => setAddingStopLoc(null)}
        title="Add Bus Stop to Route"
        description="Name the newly clicked stop coordinate"
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
              Coordinates: {addingStopLoc.lat.toFixed(5)}, {addingStopLoc.lng.toFixed(5)}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddingStopLoc(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveNewStop} disabled={!newStopName.trim()}>
              Add Stop to Route
            </Button>
          </div>
        </div>
      </Modal>

      {/* Side Panel: Routes List & Stops Directory */}
      <div className="w-full lg:w-84 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-slate-200/90 lg:h-full h-auto overflow-y-auto shrink-0 shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Route Management</h3>
            <span className="text-[10px] text-slate-500 font-medium">{routes.length} Active Corridors</span>
          </div>
          <Button
            size="sm"
            onClick={() => setCreationStep('selecting_origin')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Route
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Active Routes */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
              Municipal Corridors
            </span>
            <div className="space-y-1.5">
              {routes.map((r) => {
                const isSelected = selectedRoute?.id === r.id;
                return (
                  <div key={r.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelectRoute(r)}
                      className={`w-full p-3 rounded-2xl text-left transition-all text-xs pr-11 border ${
                        isSelected
                          ? 'bg-purple-50/80 border-[#7847CB] shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                          isSelected ? 'bg-[#7847CB] text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.route_number}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {r.origin} ➔ {r.destination}
                        </span>
                      </div>
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoute(r.id, r.route_number);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete Route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stops for Selected Route */}
          {selectedRoute && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Route Stops ({stops.length})
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">Click map to add stop</span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {stops.map((routeStop, i) => (
                  <div key={routeStop.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-white border border-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">{routeStop.stops.stop_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStop(routeStop.id, routeStop.stops.stop_name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
            <Polyline positions={routePositions} color="#7847CB" weight={5} opacity={0.85} />
          )}

          {stops.map((rs, i) => (
            <Marker key={rs.id} position={[rs.stops.lat, rs.stops.lng]} icon={stopIcon}>
              <Popup>
                <div className="font-bold">{i + 1}. {rs.stops.stop_name}</div>
              </Popup>
            </Marker>
          ))}

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
            <Marker position={[creationPins.origin.lat, creationPins.origin.lng]}><Popup>Selected Origin</Popup></Marker>
          )}
          {creationPins.dest && (
            <Marker position={[creationPins.dest.lat, creationPins.dest.lng]}><Popup>Selected Destination</Popup></Marker>
          )}
        </MapContainer>
        
        {creationStep !== 'idle' && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl z-[1000] border border-purple-200">
            <p className="text-xs font-bold text-[#7847CB] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7847CB] animate-ping" />
              {creationStep === 'selecting_origin' ? 'Click map to drop Origin terminal pin' : 'Click map to drop Destination terminal pin'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
