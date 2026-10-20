import L from 'leaflet';

export interface ModernBusIconOptions {
  isSelected?: boolean;
  speedKmh?: number;
  status?: string;
  isSelf?: boolean;
  heading?: number;
  isDemo?: boolean;
}

/**
 * Generates an ultra-modern, animated transit vehicle icon for Leaflet maps.
 * Replaces old static bus emojis with a futuristic EV radar beacon pod with
 * dual animated sonar pulse rings and a sleek glassmorphism telemetry label.
 */
export const createModernBusIcon = (
  busNumber: string,
  options: ModernBusIconOptions = {}
): L.DivIcon => {
  const {
    isSelected = false,
    speedKmh = 0,
    status = 'on_time',
    isSelf = false,
    isDemo = false
  } = options;

  const isMoving = speedKmh > 2;
  const isOffRoute = status === 'off_route';
  
  // Theme styling based on vehicle state (Demo gets distinct vibrant amber/gold theme; Live Driver gets vibrant emerald green)
  const podColor = isDemo
    ? '#F59E0B'
    : (isOffRoute ? '#EF4444' : (isSelected ? '#059669' : '#10B981'));

  const ringColor = isDemo
    ? 'rgba(245, 158, 11, 0.55)'
    : (isOffRoute ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.55)');

  const html = `
    <div class="modern-bus-beacon-wrapper ${isSelected ? 'is-selected' : ''} ${isDemo ? 'is-demo-bus' : 'is-live-driver-bus'}" style="--beacon-ring-color: ${ringColor}; --beacon-pod-color: ${podColor};">
      <!-- Dual Concentric Sonar Pulse Rings -->
      <div class="beacon-sonar-wave wave-1"></div>
      <div class="beacon-sonar-wave wave-2"></div>
      
      <!-- Modern Vehicle Pod -->
      <div class="beacon-vehicle-pod ${isMoving ? 'is-moving' : 'is-idle'}">
        <!-- Sleek Vector EV Bus Glyph -->
        <svg class="beacon-bus-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Main Bus Body Shell -->
          <rect x="3.5" y="2.5" width="17" height="19" rx="4" fill="url(#busGradient-${busNumber.replace(/[^a-zA-Z0-9]/g, '')})" stroke="#FFFFFF" stroke-width="1.6"/>
          <!-- Windshield with reflection -->
          <rect x="5.5" y="4.5" width="13" height="6.5" rx="2" fill="#E0F2FE" fill-opacity="0.95"/>
          <path d="M7 6L11 9.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
          <!-- Modern LED Headlights -->
          <circle cx="6.5" cy="14.5" r="1.3" fill="#FEF08A"/>
          <circle cx="17.5" cy="14.5" r="1.3" fill="#FEF08A"/>
          <!-- Center Transit Emblem / Bumper -->
          <rect x="10" y="14" width="4" height="1.2" rx="0.6" fill="#FFFFFF"/>
          <rect x="6" y="17.5" width="12" height="1.5" rx="0.75" fill="#1E293B" opacity="0.6"/>
          <!-- Wheels indicator -->
          <rect x="2.5" y="6" width="1" height="3" rx="0.5" fill="#334155"/>
          <rect x="20.5" y="6" width="1" height="3" rx="0.5" fill="#334155"/>
          <rect x="2.5" y="15" width="1" height="3" rx="0.5" fill="#334155"/>
          <rect x="20.5" y="15" width="1" height="3" rx="0.5" fill="#334155"/>
          
          <defs>
            <linearGradient id="busGradient-${busNumber.replace(/[^a-zA-Z0-9]/g, '')}" x1="3.5" y1="2.5" x2="20.5" y2="21.5" gradientUnits="userSpaceOnUse">
              <stop stop-color="${podColor}"/>
              <stop offset="1" stop-color="${isDemo ? '#78350F' : '#064E3B'}"/>
            </linearGradient>
          </defs>
        </svg>

        <!-- Live Satellite Dot Indicator -->
        <span class="beacon-satellite-dot ${isMoving ? 'active-ping' : ''}"></span>
      </div>

      <!-- Floating Glassmorphism Telemetry Pill -->
      <div class="beacon-label-pill ${isDemo ? 'is-demo-pill' : 'is-live-driver-pill'}">
        ${isDemo ? '<span class="beacon-demo-tag">DEMO</span>' : '<span class="beacon-live-gps-tag">LIVE GPS</span>'}
        <span class="beacon-bus-number">${busNumber}</span>
        ${speedKmh > 0 ? `<span class="beacon-speed-badge">${speedKmh}<small>km/h</small></span>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'modern-bus-div-icon',
    html,
    iconSize: [84, 54],
    iconAnchor: [42, 27],
    popupAnchor: [0, -28]
  });
};
