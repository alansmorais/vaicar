import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Plus,
  Minus,
  Car,
  Flag,
  Crosshair,
  RefreshCw,
  Layers,
  ArrowRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { Zone, Driver } from '../types.ts';

interface PassengerInteractiveMapProps {
  zones: Zone[];
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number | null;
  destLng: number | null;
  destAddress: string | null;
  availableDrivers: any[];
  selectedDriver: any | null;
  onUpdatePickup: (lat: number, lng: number, address: string) => void;
  onSelectDestination: (lat: number, lng: number, address: string, zoneId?: string) => void;
  onSelectDriver: (driver: any) => void;
  onRequestRide: () => void;
  isSubmittingRide?: boolean;
}

// Convert Lat/Lng to Slippy Map Tile Coordinates
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export const PassengerInteractiveMap: React.FC<PassengerInteractiveMapProps> = ({
  zones,
  pickupLat,
  pickupLng,
  pickupAddress,
  destLat,
  destLng,
  destAddress,
  availableDrivers,
  selectedDriver,
  onUpdatePickup,
  onSelectDestination,
  onSelectDriver,
  onRequestRide,
  isSubmittingRide = false,
}) => {
  // Map View State
  const [centerLat, setCenterLat] = useState<number>(pickupLat || -23.8078);
  const [centerLng, setCenterLng] = useState<number>(pickupLng || -45.4058);
  const [zoom, setZoom] = useState<number>(14);

  // Interaction State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isMovablePickupMode, setIsMovablePickupMode] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');

  // Destination Search Modal State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 520,
  });

  // Track Container Dimensions
  useEffect(() => {
    const updateSize = () => {
      if (mapContainerRef.current) {
        setDimensions({
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight || 520,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Request Real Browser GPS Geolocation
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setIsLocatingUser(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setCenterLat(latitude);
        setCenterLng(longitude);

        // Find nearest zone
        let nearestZone = zones[0];
        let minD = Infinity;
        zones.forEach((z) => {
          const d = Math.hypot(z.lat - latitude, z.lng - longitude);
          if (d < minD) {
            minD = d;
            nearestZone = z;
          }
        });

        // Try reverse geocode via Nominatim
        let resolvedAddress = `${nearestZone?.name || 'Localização Atual'}, São Sebastião - SP`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              const road = data.address?.road || '';
              const houseNumber = data.address?.house_number || '';
              const suburb = data.address?.suburb || data.address?.neighbourhood || nearestZone?.name || '';
              resolvedAddress = [road ? (houseNumber ? `${road}, ${houseNumber}` : road) : '', suburb, 'São Sebastião - SP']
                .filter(Boolean)
                .join(', ');
            }
          }
        } catch {
          // fallback to nearest zone
        }

        onUpdatePickup(latitude, longitude, resolvedAddress);
      },
      (err) => {
        setIsLocatingUser(false);
        setGpsError('Não foi possível obter sua localização exata. Usando centro de São Sebastião.');
        setTimeout(() => setGpsError(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [zones, onUpdatePickup]);

  // Initial Geolocation load on mount
  useEffect(() => {
    handleGetCurrentLocation();
  }, []);

  // Convert (Lat, Lng) to Screen Coordinates relative to container center
  const projectToScreen = useCallback(
    (lat: number, lng: number) => {
      const centerTileX = lon2tile(centerLng, zoom);
      const centerTileY = lat2tile(centerLat, zoom);
      const targetTileX = lon2tile(lng, zoom);
      const targetTileY = lat2tile(lat, zoom);

      const x = dimensions.width / 2 + (targetTileX - centerTileX) * 256;
      const y = dimensions.height / 2 + (targetTileY - centerTileY) * 256;
      return { x, y };
    },
    [centerLat, centerLng, zoom, dimensions]
  );

  // Convert Screen Coordinates back to (Lat, Lng)
  const screenToCoord = useCallback(
    (x: number, y: number) => {
      const centerTileX = lon2tile(centerLng, zoom);
      const centerTileY = lat2tile(centerLat, zoom);
      const targetTileX = centerTileX + (x - dimensions.width / 2) / 256;
      const targetTileY = centerTileY + (y - dimensions.height / 2) / 256;
      return {
        lat: tile2lat(targetTileY, zoom),
        lng: tile2lon(targetTileX, zoom),
      };
    },
    [centerLat, centerLng, zoom, dimensions]
  );

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const centerTileX = lon2tile(centerLng, zoom) - dx / 256;
    const centerTileY = lat2tile(centerLat, zoom) - dy / 256;

    const newLng = tile2lon(centerTileX, zoom);
    const newLat = tile2lat(centerTileY, zoom);

    setCenterLat(newLat);
    setCenterLng(newLng);

    if (isMovablePickupMode) {
      onUpdatePickup(newLat, newLng, `Coordenadas: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Calculate Tiles to Render around Center
  const tileGrid = React.useMemo(() => {
    const centerTileX = Math.floor(lon2tile(centerLng, zoom));
    const centerTileY = Math.floor(lat2tile(centerLat, zoom));
    const rangeX = Math.ceil(dimensions.width / 512) + 1;
    const rangeY = Math.ceil(dimensions.height / 512) + 1;

    const tiles: { x: number; y: number; key: string; left: number; top: number; url: string }[] = [];
    const centerFracX = lon2tile(centerLng, zoom) - centerTileX;
    const centerFracY = lat2tile(centerLat, zoom) - centerTileY;

    for (let dx = -rangeX; dx <= rangeX; dx++) {
      for (let dy = -rangeY; dy <= rangeY; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const maxTile = Math.pow(2, zoom);
        if (ty >= 0 && ty < maxTile) {
          const normX = ((tx % maxTile) + maxTile) % maxTile;
          const left = dimensions.width / 2 + (dx - centerFracX) * 256;
          const top = dimensions.height / 2 + (dy - centerFracY) * 256;
          tiles.push({
            x: normX,
            y: ty,
            key: `${zoom}-${normX}-${ty}`,
            left,
            top,
            url: `https://basemaps.cartocdn.com/dark_all/${zoom}/${normX}/${ty}.png`,
          });
        }
      }
    }
    return tiles;
  }, [centerLat, centerLng, zoom, dimensions]);

  // Projected Points
  const pickupPos = projectToScreen(pickupLat, pickupLng);
  const destPos = destLat !== null && destLng !== null ? projectToScreen(destLat, destLng) : null;

  // Search Filter
  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="relative w-full h-[520px] sm:h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none">
      {/* Map Interactive Viewport */}
      <div
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Render Map Tiles */}
        {tileGrid.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            draggable={false}
            style={{
              position: 'absolute',
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              width: '256px',
              height: '256px',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* SVG Overlay for Route Line */}
        {destPos && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <line
              x1={pickupPos.x}
              y1={pickupPos.y}
              x2={destPos.x}
              y2={destPos.y}
              stroke="#10B981"
              strokeWidth="4"
              strokeDasharray="8 6"
              className="animate-pulse"
            />
          </svg>
        )}

        {/* Pickup Pin 📍 */}
        {!isMovablePickupMode && (
          <div
            style={{
              position: 'absolute',
              left: `${pickupPos.x}px`,
              top: `${pickupPos.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-20 pointer-events-none flex flex-col items-center animate-in zoom-in-50"
          >
            <div className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap mb-1">
              📍 Embarque
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center animate-ping absolute -bottom-1" />
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xl text-slate-950">
              <MapPin className="w-5 h-5 fill-slate-950" />
            </div>
          </div>
        )}

        {/* Destination Pin 🏁 */}
        {destPos && (
          <div
            style={{
              position: 'absolute',
              left: `${destPos.x}px`,
              top: `${destPos.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-20 pointer-events-none flex flex-col items-center animate-in zoom-in-50"
          >
            <div className="bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap mb-1">
              🏁 Destino
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center shadow-xl text-slate-950">
              <Flag className="w-4 h-4 fill-slate-950" />
            </div>
          </div>
        )}

        {/* Available Drivers Markers 🚗 */}
        {availableDrivers.map((driver, idx) => {
          const angle = (idx * (360 / Math.max(1, availableDrivers.length))) * (Math.PI / 180);
          const dLat = pickupLat + 0.007 * Math.sin(angle);
          const dLng = pickupLng + 0.007 * Math.cos(angle);
          const dPos = projectToScreen(dLat, dLng);
          const isSelected = selectedDriver?.driverId === driver.driverId;

          return (
            <div
              key={driver.driverId || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDriver(driver);
              }}
              style={{
                position: 'absolute',
                left: `${dPos.x}px`,
                top: `${dPos.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`z-20 cursor-pointer p-1 rounded-full transition-transform hover:scale-125 ${
                isSelected ? 'scale-125' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  isSelected
                    ? 'bg-amber-500 border-white text-slate-950 ring-4 ring-amber-500/30'
                    : 'bg-slate-900 border-sky-400 text-sky-400'
                }`}
              >
                <Car className="w-4 h-4" />
              </div>
            </div>
          );
        })}

        {/* Movable Pin at Dead Center */}
        {isMovablePickupMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="flex flex-col items-center -translate-y-4">
              <div className="bg-emerald-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full shadow-2xl mb-1">
                📍 Arraste para escolher o local de embarque
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-2xl text-slate-950">
                <MapPin className="w-6 h-6 fill-slate-950" />
              </div>
              <div className="w-2 h-2 rounded-full bg-white shadow" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        {/* GPS Geolocation Button */}
        <button
          onClick={handleGetCurrentLocation}
          title="Minha Localização Atual"
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >
          <Crosshair className={`w-5 h-5 ${isLocatingUser ? 'animate-spin' : ''}`} />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom((z) => Math.min(18, z + 1))}
          title="Aumentar Zoom"
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom((z) => Math.max(10, z - 1))}
          title="Diminuir Zoom"
          className="w-10 h-10 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {/* GPS Error Toast */}
      {gpsError && (
        <div className="absolute top-4 left-4 right-16 z-30 bg-rose-950/90 border border-rose-800/80 text-rose-300 text-xs px-3 py-2 rounded-xl backdrop-blur-md shadow-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Bottom Floating Control Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-30 space-y-3 pointer-events-auto">
        <div className="bg-slate-900/95 border border-slate-800/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl space-y-3">
          {/* Pickup Address Display & Change Toggle */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Embarque</span>
                <span className="text-xs text-white font-bold truncate block">{pickupAddress}</span>
              </div>
            </div>

            <button
              onClick={() => setIsMovablePickupMode(!isMovablePickupMode)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded-lg hover:bg-emerald-950/50 cursor-pointer transition-colors shrink-0"
            >
              {isMovablePickupMode ? 'Confirmar' : 'Ajustar Pino'}
            </button>
          </div>

          {/* Destination Search Bar */}
          {!destAddress ? (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-left px-4 py-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all"
            >
              <Search className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Para onde vamos?</span>
                <span className="text-[11px] text-slate-400 block">Escolha praia, bairro ou centro de São Sebastião</span>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-cyan-300 font-semibold block uppercase">Destino</span>
                    <span className="text-xs text-white font-bold truncate block">{destAddress}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold px-2 py-1 rounded-lg hover:bg-cyan-950/50 cursor-pointer transition-colors shrink-0"
                >
                  Trocar
                </button>
              </div>

              {/* Selected Driver Compact Sheet */}
              {selectedDriver && (
                <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-sm">
                      {selectedDriver.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{selectedDriver.name}</span>
                        <span className="text-[10px] text-amber-400 font-bold">★ {selectedDriver.ratingAverage || 5.0}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {selectedDriver.vehicle?.brand} {selectedDriver.vehicle?.model} • {selectedDriver.vehicle?.color}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 block">
                      R$ {(selectedDriver.fare || 25).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] text-sky-400 font-medium block">
                      ~{selectedDriver.arrivalTimeMin || 4} min
                    </span>
                  </div>
                </div>
              )}

              {/* Request Ride Action */}
              <button
                onClick={onRequestRide}
                disabled={isSubmittingRide || !selectedDriver}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingRide ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Solicitando corrida...</span>
                  </>
                ) : (
                  <>
                    <Car className="w-4 h-4" />
                    <span>Confirmar e Solicitar Corrida</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Destination Search Modal Overlay */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Para Onde Vamos?</span>
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Digite o nome da praia ou bairro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredZones.map((z) => (
              <button
                key={z.id}
                onClick={() => {
                  onSelectDestination(z.lat, z.lng, `${z.name}, São Sebastião - SP`, z.id);
                  setCenterLat((pickupLat + z.lat) / 2);
                  setCenterLng((pickupLng + z.lng) / 2);
                  setIsSearchOpen(false);
                }}
                className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{z.name}</span>
                    <span className="text-[10px] text-slate-400 block">{z.distanceFromCenterKm} km do Centro Histórico</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
