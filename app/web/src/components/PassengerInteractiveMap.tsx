// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Map,
  AdvancedMarker,
  Polyline,
  useMap,
  MapControl,
  ControlPosition,
} from '@vis.gl/react-google-maps';
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
  Compass,
  Clock,
  ShieldCheck,
  ArrowRight,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { Zone, Driver, Ride } from '../types.ts';
import { reverseGeocode, computeRouteDirections, decodePolyline, searchPlaces, PlaceSearchResult } from '../lib/api.ts';
import { MapErrorBoundary } from './MapErrorBoundary.tsx';

export interface PassengerInteractiveMapProps {
  zones: Zone[];
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number | null;
  destLng: number | null;
  destAddress: string | null;
  availableDrivers?: any[];
  selectedDriver?: any | null;
  activeRide?: Ride | null;
  onUpdatePickup: (lat: number, lng: number, address: string) => void;
  onSelectDestination: (lat: number, lng: number, address: string, zoneId?: string) => void;
  onSelectDriver?: (driver: any) => void;
  onRequestRide?: () => void;
  isSubmittingRide?: boolean;
  className?: string;
}

// Controller component to programmatically pan/zoom the Google Map instance
function MapController({
  targetCenter,
  targetZoom,
  routeBounds,
}: {
  targetCenter: { lat: number; lng: number } | null;
  targetZoom?: number;
  routeBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
}) {
  const map = useMap('vaicar-passenger-map');

  useEffect(() => {
    if (!map) return;
    if (routeBounds && typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds(
        { lat: routeBounds.minLat, lng: routeBounds.minLng },
        { lat: routeBounds.maxLat, lng: routeBounds.maxLng }
      );
      map.fitBounds(bounds, { top: 70, right: 50, bottom: 90, left: 50 });
    } else if (targetCenter) {
      map.panTo(targetCenter);
      if (targetZoom) map.setZoom(targetZoom);
    }
  }, [map, targetCenter, targetZoom, routeBounds]);

  return null;
}

export const PassengerInteractiveMap: React.FC<PassengerInteractiveMapProps> = ({
  zones,
  pickupLat,
  pickupLng,
  pickupAddress,
  destLat,
  destLng,
  destAddress,
  availableDrivers = [],
  selectedDriver,
  activeRide,
  onUpdatePickup,
  onSelectDestination,
  onSelectDriver,
  onRequestRide,
  isSubmittingRide = false,
  className = '',
}) => {
  // Map center state (Defaults to São Sebastião - SP)
  const defaultCenter = { lat: pickupLat || -23.8078, lng: pickupLng || -45.4058 };
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  // Programmatic pan target
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  // Destination search modal
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);

  // Search Places / Addresses with real Google Places API
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const results = await searchPlaces(searchQuery.trim());
        setPlaceSuggestions(results);
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Route calculation state
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);

  // Live driver tracking state for active ride
  const [liveDriverPos, setLiveDriverPos] = useState<{
    lat: number;
    lng: number;
    heading?: number;
    speedKmh?: number;
  } | null>(null);

  // Debounced geocoding timer ref
  const geocodeTimerRef = useRef<any>(null);

  // Keep internal state aligned with props when pickup changes externally
  useEffect(() => {
    if (pickupLat && pickupLng && !isMapMoving) {
      setMapCenter({ lat: pickupLat, lng: pickupLng });
    }
  }, [pickupLat, pickupLng]);

  // Handle User Center Movement (Fixed Pin Pickup Logic)
  // When map camera changes, if destLat == null, user is choosing pickup location
  const handleCameraChange = useCallback(
    (ev: any) => {
      if (!ev.detail.center) return;
      const { lat, lng } = ev.detail.center;
      setMapCenter({ lat, lng });
      setIsMapMoving(true);

      // Debounce reverse geocoding after user finishes dragging
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = setTimeout(async () => {
        setIsMapMoving(false);
        // Only update pickup if destination is not yet fixed or in pickup mode
        if (!destLat) {
          setIsReverseGeocoding(true);
          try {
            const res = await reverseGeocode(lat, lng);
            onUpdatePickup(lat, lng, res.address);
          } catch (e) {
            console.warn('Geocode error:', e);
            onUpdatePickup(lat, lng, `Localização (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          } finally {
            setIsReverseGeocoding(false);
          }
        }
      }, 450);
    },
    [destLat, onUpdatePickup]
  );

  // Current GPS Location Handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não suportada pelo navegador.');
      return;
    }

    setIsLocatingUser(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPanTarget({ lat, lng });
        setMapCenter({ lat, lng });
        setIsLocatingUser(false);

        // Reverse geocode user GPS position
        setIsReverseGeocoding(true);
        try {
          const res = await reverseGeocode(lat, lng);
          onUpdatePickup(lat, lng, res.address);
        } catch (e) {
          onUpdatePickup(lat, lng, `Meu GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } finally {
          setIsReverseGeocoding(false);
        }
      },
      (err) => {
        console.warn('GPS error:', err);
        setIsLocatingUser(false);
        setGpsError('Não foi possível obter sua localização exata. Permita o acesso ao GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Calculate Route when both Pickup and Destination exist
  useEffect(() => {
    let isCancelled = false;

    if (pickupLat && pickupLng && destLat && destLng) {
      computeRouteDirections(pickupLat, pickupLng, destLat, destLng)
        .then((result) => {
          if (isCancelled) return;
          setRouteDistanceKm(result.distanceKm);
          setRouteDurationMin(result.durationMin);

          if (result.encodedPolyline) {
            const points = decodePolyline(result.encodedPolyline);
            setRoutePath(points);
          } else {
            // Direct connecting route fallback
            setRoutePath([
              { lat: pickupLat, lng: pickupLng },
              { lat: destLat, lng: destLng },
            ]);
          }
        })
        .catch((err) => {
          console.warn('Route computation error:', err);
          if (!isCancelled) {
            setRoutePath([
              { lat: pickupLat, lng: pickupLng },
              { lat: destLat, lng: destLng },
            ]);
          }
        });
    } else {
      setRoutePath([]);
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [pickupLat, pickupLng, destLat, destLng]);

  // Real-time Driver GPS polling for active ride
  useEffect(() => {
    if (!activeRide || !activeRide.id) {
      setLiveDriverPos(null);
      return;
    }

    const pollDriverLocation = async () => {
      try {
        const phoneParam = activeRide.passengerPhone ? `?passengerPhone=${encodeURIComponent(activeRide.passengerPhone)}` : '';
        const res = await fetch(`/api/v1/rides/${activeRide.id}/driver-location${phoneParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.driverLocation && data.driverLocation.lat) {
            setLiveDriverPos({
              lat: Number(data.driverLocation.lat),
              lng: Number(data.driverLocation.lng),
              heading: data.driverLocation.heading || 0,
              speedKmh: data.driverLocation.speedKmh,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to poll driver location:', err);
      }
    };

    pollDriverLocation();
    const interval = setInterval(pollDriverLocation, 4000);
    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status]);

  // Click on Map to Select Destination
  const handleMapClick = (ev: any) => {
    if (ev.detail && ev.detail.latLng) {
      const lat = ev.detail.latLng.lat;
      const lng = ev.detail.latLng.lng;
      reverseGeocode(lat, lng).then((res) => {
        onSelectDestination(lat, lng, res.address);
      });
    }
  };

  // Destination Search Filter
  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col ${className}`}
      style={{ minHeight: '440px', height: '520px' }}
    >
      {/* Real Google Maps Container */}
      <div className="relative w-full h-full">
        <MapErrorBoundary>
          <Map
            id="vaicar-passenger-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={14}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            onCameraChanged={handleCameraChange}
            onClick={handleMapClick}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <MapController
              targetCenter={panTarget}
              routeBounds={
                destLat && destLng
                  ? {
                      minLat: Math.min(pickupLat, destLat) - 0.01,
                      maxLat: Math.max(pickupLat, destLat) + 0.01,
                      minLng: Math.min(pickupLng, destLng) - 0.01,
                      maxLng: Math.max(pickupLng, destLng) + 0.01,
                    }
                  : null
              }
            />

            {/* 1. Pickup Marker (Shown when destination is set) */}
            {destLat && (
              <AdvancedMarker position={{ lat: pickupLat, lng: pickupLng }} title="Local de Embarque">
                <div className="flex flex-col items-center">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-md border border-emerald-300 whitespace-nowrap mb-1">
                    📍 Embarque
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white">
                    <MapPin className="w-5 h-5 fill-current" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* 2. Destination Marker */}
            {destLat && destLng && (
              <AdvancedMarker position={{ lat: destLat, lng: destLng }} title="Destino">
                <div className="flex flex-col items-center">
                  <span className="bg-sky-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-md border border-sky-300 whitespace-nowrap mb-1">
                    🏁 Destino
                  </span>
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white">
                    <Flag className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* 3. Nearby Online Drivers Markers */}
            {availableDrivers &&
              availableDrivers.map((drv: any) => {
                const dLat = drv.lat || drv.currentLat || (drv.zone ? drv.zone.lat : -23.805);
                const dLng = drv.lng || drv.currentLng || (drv.zone ? drv.zone.lng : -45.402);
                if (!dLat || !dLng) return null;

                return (
                  <AdvancedMarker
                    key={`driver-${drv.id || drv.driverId}`}
                    position={{ lat: dLat, lng: dLng }}
                    title={`${drv.name} (${drv.vehicle?.brand || 'Carro'})`}
                    onClick={() => onSelectDriver && onSelectDriver(drv)}
                  >
                    <div className="group cursor-pointer flex flex-col items-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 shadow whitespace-nowrap mb-1">
                        {drv.name}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-400 border-2 border-emerald-400 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                        <Car className="w-4 h-4" />
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* 4. Live Driver Marker for Active Ride */}
            {liveDriverPos && (
              <AdvancedMarker
                position={{ lat: liveDriverPos.lat, lng: liveDriverPos.lng }}
                title={`Motorista: ${activeRide?.driverName || 'VaiCar'}`}
              >
                <div className="flex flex-col items-center animate-pulse">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-lg border border-emerald-200 whitespace-nowrap mb-1">
                    🚗 {activeRide?.driverName?.split(' ')[0] || 'Motorista'}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white transform transition-transform"
                    style={{
                      transform: `rotate(${liveDriverPos.heading || 0}deg)`,
                    }}
                  >
                    <Navigation className="w-5 h-5 fill-current" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* 5. Route Polyline on Roads */}
            {routePath.length > 0 && (
              <Polyline
                path={routePath}
                strokeColor="#10B981"
                strokeOpacity={0.85}
                strokeWeight={5}
              />
            )}
          </Map>
        </MapErrorBoundary>

        {/* 6. Fixed Center Pickup Pin (Active when destination is not yet chosen) */}
        {!destLat && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8 z-20">
            {/* Top Badge */}
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-black shadow-xl border flex items-center gap-1.5 transition-all duration-200 transform ${
                isMapMoving
                  ? 'bg-slate-900/90 text-amber-300 border-amber-400/80 scale-105 -translate-y-2'
                  : 'bg-slate-900/95 text-emerald-400 border-emerald-500/80'
              }`}
            >
              {isMapMoving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Definindo ponto de embarque...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Local de Embarque</span>
                </>
              )}
            </div>

            {/* Central Pin Icon */}
            <div
              className={`transform transition-transform duration-200 my-1 ${
                isMapMoving ? '-translate-y-2 scale-110' : 'translate-y-0'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white">
                <MapPin className="w-6 h-6 fill-current" />
              </div>
            </div>

            {/* Ground Anchor Shadow */}
            <div
              className={`w-3.5 h-1.5 rounded-full bg-slate-950/80 blur-[1px] transition-all duration-200 ${
                isMapMoving ? 'scale-75 opacity-40' : 'scale-100 opacity-90'
              }`}
            />
          </div>
        )}

        {/* 7. Floating Top Map Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto z-30">
          {/* Pickup address summary pill */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 max-w-[70%] sm:max-w-[75%] shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <div className="truncate">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                {destLat ? 'Origem' : 'Arraste o mapa para posicionar o embarque'}
              </span>
              <span className="text-white font-semibold truncate block">
                {isReverseGeocoding ? 'Buscando endereço...' : pickupAddress || 'São Sebastião - SP'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* GPS Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingUser}
              title="Centralizar na minha localização GPS"
              className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-emerald-400 p-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center"
            >
              <Navigation className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
            </button>

            {/* Destination Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {destAddress ? 'Alterar Destino' : 'Definir Destino'}
              </span>
            </button>
          </div>
        </div>

        {/* 8. Active Trip Status Overlay (When active ride exists) */}
        {activeRide && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-950/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl z-30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-black text-white uppercase tracking-wider">
                  {activeRide.status === 'REQUESTED' && 'Chamada enviada ao motorista'}
                  {activeRide.status === 'ACCEPTED' && 'Motorista aceitou a corrida'}
                  {activeRide.status === 'DRIVER_ARRIVING' && 'Motorista a caminho do embarque'}
                  {activeRide.status === 'PASSENGER_PICKED_UP' && 'Embarque realizado'}
                  {activeRide.status === 'IN_PROGRESS' && 'Viagem em andamento'}
                  {activeRide.status === 'COMPLETED' && 'Viagem finalizada'}
                </span>
              </div>
              <span className="bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {activeRide.estimatedPrice ? `R$ ${activeRide.estimatedPrice.toFixed(2)}` : 'Preço Direto'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>{activeRide.driverName}</strong> • {activeRide.driverVehicle}
                </span>
              </div>
              {liveDriverPos?.speedKmh !== undefined && liveDriverPos.speedKmh > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {Math.round(liveDriverPos.speedKmh)} km/h
                </span>
              )}
            </div>
          </div>
        )}

        {/* 9. Route Distance & ETA Pill (When Route is Calculated and No Active Ride) */}
        {!activeRide && routeDistanceKm !== null && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl z-30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Compass className="w-4 h-4" />
                <span>{routeDistanceKm} km</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                <Clock className="w-4 h-4" />
                <span>~{routeDurationMin} min de trajeto</span>
              </div>
            </div>

            {onRequestRide && (
              <button
                type="button"
                onClick={onRequestRide}
                disabled={isSubmittingRide}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingRide ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <span>Confirmar Rota</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 10. Destination Selection Modal / Drawer */}
      {isSearchOpen && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Para onde você deseja ir?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o endereço, rua, comércio ou praia de destino..."
                className="w-full bg-slate-900 text-white text-xs pl-10 pr-10 py-3 rounded-xl border border-slate-800 focus:border-sky-500 outline-none"
                autoFocus
              />
              {isSearchingPlaces && (
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin absolute right-3 top-3.5" />
              )}
            </div>

            {/* Real Google Places & Geocoding Results */}
            {placeSuggestions.length > 0 && (
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">
                  Endereços e Locais Encontrados (Google Maps):
                </span>
                <div className="space-y-1.5">
                  {placeSuggestions.map((place, idx) => (
                    <button
                      key={`place-${idx}-${place.lat}-${place.lng}`}
                      type="button"
                      onClick={() => {
                        const exactDest = place.formattedAddress || (place.subtitle ? `${place.title} - ${place.subtitle}` : place.title);
                        onSelectDestination(place.lat, place.lng, exactDest);
                        setIsSearchOpen(false);
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-sky-500/20 hover:border-sky-500/50 text-left transition-all cursor-pointer flex items-start gap-2.5 group"
                    >
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate">{place.title}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{place.subtitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Beach & Zone Selector */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                {placeSuggestions.length > 0 ? 'Ou escolha uma praia/bairro de São Sebastião:' : 'Praias e Bairros de São Sebastião (SP-055):'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                {filteredZones.map((z) => (
                  <button
                    key={`zone-dest-${z.id}`}
                    type="button"
                    onClick={() => {
                      onSelectDestination(z.lat, z.lng, `${z.name}, São Sebastião - SP`, z.id);
                      setIsSearchOpen(false);
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-sky-500/20 hover:border-sky-500/50 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-white block truncate">{z.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {z.distanceFromCenterKm ? `~${z.distanceFromCenterKm} km do Centro` : 'Litoral'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Dica: Você também pode clicar diretamente em qualquer ponto do mapa!</span>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* GPS Error Toast */}
      {gpsError && (
        <div className="absolute bottom-16 left-4 right-4 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl flex items-center justify-between z-30 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            onClick={() => setGpsError('')}
            className="text-rose-400 hover:text-white font-bold text-xs"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};
