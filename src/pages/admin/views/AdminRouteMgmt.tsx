import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { formatCurrency } from '../../../utils/formatters';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useApp } from '../../../context/AppContext';
import {
  Route as RouteIcon,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  CheckCircle2,
  Save,
  MapPin,
  X
} from 'lucide-react';

// Fix for default leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to handle map clicks and adding stops
const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const AdminRouteMgmt: React.FC = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  
  const [creationStep, setCreationStep] = useState<'idle' | 'selecting_origin' | 'selecting_destination' | 'filling_details'>('idle');
  const [newRoute, setNewRoute] = useState({ routeNumber: '', origin: '', destination: '' });
  const [creationPins, setCreationPins] = useState<{ origin?: {lat: number, lng: number}, dest?: {lat: number, lng: number} }>({});
  
  const [addingStopLoc, setAddingStopLoc] = useState<{lat: number, lng: number} | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setRoutes(data);
      if (!selectedRoute) {
        handleSelectRoute(data[0]);
      }
    } else {
      setRoutes([]);
    }
  };

  const handleSelectRoute = async (route: any) => {
    setSelectedRoute(route);
    // Fetch stops for this route
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
      
    if (data) {
      setStops(data);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create the Route
    const { data: routeData, error } = await supabase.from('routes').insert([{
      route_number: newRoute.routeNumber,
      origin: newRoute.origin,
      destination: newRoute.destination
    }]).select().single();

    if (error || !routeData) {
      alert(`Error creating route: ${error?.message || 'Unknown error'}`);
      return;
    }

    // 2. Automatically create stops for Origin and Destination if pins were dropped
    if (creationPins.origin) {
      const { data: originStop } = await supabase.from('stops').insert([{
        stop_name: newRoute.origin,
        lat: creationPins.origin.lat,
        lng: creationPins.origin.lng,
        location: `POINT(${creationPins.origin.lng} ${creationPins.origin.lat})`
      }]).select().single();

      if (originStop) {
        await supabase.from('route_stops').insert([{
          route_id: routeData.id,
          stop_id: originStop.id,
          stop_order: 1,
          estimated_minutes_from_origin: 0
        }]);
      }
    }

    if (creationPins.dest) {
      const { data: destStop } = await supabase.from('stops').insert([{
        stop_name: newRoute.destination,
        lat: creationPins.dest.lat,
        lng: creationPins.dest.lng,
        location: `POINT(${creationPins.dest.lng} ${creationPins.dest.lat})`
      }]).select().single();

      if (destStop) {
        await supabase.from('route_stops').insert([{
          route_id: routeData.id,
          stop_id: destStop.id,
          stop_order: 2,
          estimated_minutes_from_origin: 45 // rough estimate for end of route
        }]);
      }
    }

    setCreationStep('idle');
    setNewRoute({ routeNumber: '', origin: '', destination: '' });
    setCreationPins({});
    fetchRoutes();
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      // Extract a decent name
      return data.address?.suburb || data.address?.village || data.address?.city_district || data.name || data.display_name.split(',')[0];
    } catch (e) {
      console.error(e);
      return 'Unknown Location';
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (creationStep === 'selecting_origin') {
      const name = await reverseGeocode(lat, lng);
      setCreationPins(prev => ({ ...prev, origin: { lat, lng } }));
      setNewRoute(prev => ({ ...prev, origin: name }));
      setCreationStep('selecting_destination');
      return;
    }
    
    if (creationStep === 'selecting_destination') {
      const name = await reverseGeocode(lat, lng);
      setCreationPins(prev => ({ ...prev, dest: { lat, lng } }));
      setNewRoute(prev => ({ ...prev, destination: name }));
      setCreationStep('filling_details');
      return;
    }

    if (!selectedRoute) return;
    setAddingStopLoc({ lat, lng });
  };

  const saveNewStop = async () => {
    if (!addingStopLoc || !newStopName) return;
    
    // 1. Create stop
    const { data: stopData, error: stopErr } = await supabase.from('stops').insert([{
      stop_name: newStopName,
      lat: addingStopLoc.lat,
      lng: addingStopLoc.lng,
      location: `POINT(${addingStopLoc.lng} ${addingStopLoc.lat})`
    }]).select().single();

    if (stopErr) { alert(stopErr.message); return; }

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
      handleSelectRoute(selectedRoute); // refresh stops
    }
  };

  const removeStop = async (routeStopId: string) => {
    await supabase.from('route_stops').delete().eq('id', routeStopId);
    handleSelectRoute(selectedRoute); // refresh stops
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm('Are you sure you want to delete this route? This will delete all associated trips and stops.')) return;
    try {
      const { error } = await supabase.from('routes').delete().eq('id', routeId);
      if (error) throw error;
      setSelectedRoute(null);
      setStops([]);
      fetchRoutes();
    } catch (err: any) {
      alert(`Error deleting route: ${err.message}`);
    }
  };

  const { buses: liveBuses } = useApp();

  const activeBusesForRoute = selectedRoute 
    ? liveBuses.filter(b => b.routeId === selectedRoute.id)
    : [];

  const routePositions: [number, number][] = stops.map(s => [s.stops.lat, s.stops.lng]);

  const getBusIcon = (busNumber: string) => {
    return L.divIcon({
      className: 'custom-bus-icon',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: #0f3c5c;
          color: white;
          font-weight: 700;
          font-size: 11px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          border: 1.5px solid white;
          white-space: nowrap;
        ">
          <span style="font-size: 12px;">🚌</span>
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
        width: 16px;
        height: 16px;
        background-color: #ffffff;
        border: 3px solid #0f3c5c;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {creationStep === 'filling_details' && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            <button onClick={() => {
              setCreationStep('idle');
              setCreationPins({});
            }} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Confirm Route Details</h3>
            <form onSubmit={handleCreateRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Route Number (e.g. R-12)</label>
                <input required type="text" value={newRoute.routeNumber} onChange={e => setNewRoute({...newRoute, routeNumber: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Origin (Editable)</label>
                <input required type="text" value={newRoute.origin} onChange={e => setNewRoute({...newRoute, origin: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Destination (Editable)</label>
                <input required type="text" value={newRoute.destination} onChange={e => setNewRoute({...newRoute, destination: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#7847CB] text-white rounded-xl font-bold">Save Route</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Stop Modal triggered from map click */}
      {addingStopLoc && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => setAddingStopLoc(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7847CB]" /> Name This Stop
            </h3>
            <div className="space-y-4">
              <div>
                <input 
                  autoFocus
                  placeholder="e.g. Central Station" 
                  type="text" 
                  value={newStopName} 
                  onChange={e => setNewStopName(e.target.value)} 
                  className="w-full px-3 py-2 border border-[#7847CB] rounded-xl text-sm" 
                />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Lat: {addingStopLoc.lat.toFixed(4)}, Lng: {addingStopLoc.lng.toFixed(4)}
              </div>
              <button onClick={saveNewStop} className="w-full py-2 bg-[#7847CB] text-white rounded-xl font-bold text-xs">Add Stop to Route</button>
            </div>
          </div>
        </div>
      )}

      {/* Side Panel (Routes & Stops) */}
      <div className="w-full lg:w-80 flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-slate-200 lg:h-full h-auto overflow-y-auto shrink-0">
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={() => setCreationStep('selecting_origin')}
            className="w-full py-2.5 rounded-xl bg-[#7847CB] text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Route
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-2 text-xs font-bold text-slate-400 uppercase">Routes</div>
          <div className="space-y-1 mb-4">
            {routes.map((r) => (
              <div key={r.id} className="relative group">
                <button
                  onClick={() => handleSelectRoute(r)}
                  className={`w-full p-3 rounded-lg text-left transition-all text-xs pr-10 ${
                    selectedRoute?.id === r.id
                      ? 'bg-[#7847CB] text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-sm mb-1">{r.route_number}</div>
                  <div className={selectedRoute?.id === r.id ? 'text-purple-200' : 'text-slate-500'}>
                    {r.origin} ➔ {r.destination}
                  </div>
                </button>
                {selectedRoute?.id === r.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRoute(r.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition shadow"
                    title="Delete Route"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {selectedRoute && (
            <>
              <div className="mb-2 px-2 text-xs font-bold text-slate-400 uppercase">Stops ({stops.length})</div>
              <div className="space-y-1">
                {stops.map((routeStop, i) => (
                  <div key={routeStop.id} className="p-2 rounded-lg bg-slate-50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 font-extrabold text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-bold">{routeStop.stops.stop_name}</span>
                    </div>
                    <button onClick={() => removeStop(routeStop.id)} className="p-1 text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 h-[50vh] lg:h-full relative z-0">
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
            <Polyline positions={routePositions} color="#0f3c5c" weight={4} opacity={0.8} />
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
                <div className="text-center">
                  <div className="font-bold text-[#0f3c5c]">{bus.busNumber}</div>
                  <div className="text-[10px] text-slate-500">{bus.speedKmh} km/h • {bus.status}</div>
                </div>
              </Tooltip>
            </Marker>
          ))}

          {creationPins.origin && (
            <Marker position={[creationPins.origin.lat, creationPins.origin.lng]}><Popup>Origin</Popup></Marker>
          )}
          {creationPins.dest && (
            <Marker position={[creationPins.dest.lat, creationPins.dest.lng]}><Popup>Destination</Popup></Marker>
          )}
        </MapContainer>
        
        {creationStep !== 'idle' && (
          <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-lg z-[1000] pointer-events-none">
            <p className="text-xs font-bold text-[#7847CB]">
              {creationStep === 'selecting_origin' ? 'Click map for Origin' : creationStep === 'selecting_destination' ? 'Click map for Destination' : 'Select route to add stops'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
