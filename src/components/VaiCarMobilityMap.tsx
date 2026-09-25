import React, { useState, useEffect, useMemo } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Car,
  Navigation,
  Sparkles,
  Zap,
  Users,
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Compass,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Zone, MobilityMapData, Driver, Ride } from '../types.ts';
import { fetchMobilityMapData } from '../lib/api.ts';

function MobilityMapCameraController({
  targetCenter,
  targetZoom,
}: {
  targetCenter: { lat: number; lng: number } | null;
  targetZoom?: number;
}) {
  const map = useMap('vaicar-city-map');
  useEffect(() => {
    if (!map || !targetCenter) return;
    map.panTo(targetCenter);
    if (targetZoom) map.setZoom(targetZoom);
  }, [map, targetCenter, targetZoom]);
  return null;
}

interface VaiCarMobilityMapProps {
  mode: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  zones: Zone[];
  onSelectRoute?: (originZoneId: string, destZoneId: string) => void;
  selectedOriginId?: string;
  selectedDestId?: string;
  className?: string;
}

export const VaiCarMobilityMap: React.FC<VaiCarMobilityMapProps> = ({
  mode,
  zones,
  onSelectRoute,
  selectedOriginId,
  selectedDestId,
  className = '',
}) => {
  const [mapData, setMapData] = useState<MobilityMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRegionFilter, setActiveRegionFilter] = useState<'ALL' | 'NORTE' | 'CENTRO' | 'SUL'>('ALL');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [localOriginId, setLocalOriginId] = useState<string>(selectedOriginId || zones[8]?.id || 'z-maresias');
  const [localDestId, setLocalDestId] = useState<string>(selectedDestId || zones[0]?.id || 'z-centro');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showOnlineDrivers, setShowOnlineDrivers] = useState(true);
  const [showActiveRides, setShowActiveRides] = useState(true);

  // Google Maps Camera Target State
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number } | null>({
    lat: -23.8078,
    lng: -45.4058,
  });
  const [cameraZoom, setCameraZoom] = useState<number>(11);

  const handleRegionFilter = (r: 'ALL' | 'NORTE' | 'CENTRO' | 'SUL') => {
    setActiveRegionFilter(r);
    if (r === 'NORTE') {
      setCameraTarget({ lat: -23.74, lng: -45.38 });
      setCameraZoom(13);
    } else if (r === 'CENTRO') {
      setCameraTarget({ lat: -23.8078, lng: -45.4058 });
      setCameraZoom(14);
    } else if (r === 'SUL') {
      setCameraTarget({ lat: -23.7915, lng: -45.55 });
      setCameraZoom(12);
    } else {
      setCameraTarget({ lat: -23.8078, lng: -45.43 });
      setCameraZoom(11);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMobilityMapData();
      setMapData(data);
    } catch (err) {
      console.warn('[MAP] Could not fetch remote mobility map data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Live poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedOriginId) setLocalOriginId(selectedOriginId);
  }, [selectedOriginId]);

  useEffect(() => {
    if (selectedDestId) setLocalDestId(selectedDestId);
  }, [selectedDestId]);

  // Geographic coordinates & classification for São Sebastião Coastline
  const enrichedZones = useMemo(() => {
    const list = mapData?.zones?.length ? mapData.zones : zones;
    return list.map((z) => {
      let region: 'NORTE' | 'CENTRO' | 'SUL' = 'SUL';
      const slug = z.slug?.toLowerCase() || z.name?.toLowerCase() || '';

      if (['canto-do-mar', 'enseada', 'jaragua', 'cigarras', 'sao-francisco', 'pontal-da-cruz'].some((s) => slug.includes(s))) {
        region = 'NORTE';
      } else if (['centro', 'topolandia', 'morro-do-abrigo', 'varadouro', 'porto-grande'].some((s) => slug.includes(s))) {
        region = 'CENTRO';
      } else {
        region = 'SUL';
      }

      const demand = mapData?.zoneDemand?.find((d) => d.zoneId === z.id);
      return {
        ...z,
        region,
        onlineDrivers: demand?.onlineDrivers ?? (z.id === 'z-centro' ? 3 : z.id === 'z-maresias' ? 2 : 1),
        activeRequests: demand?.activeRequests ?? 0,
        multiplier: demand?.multiplier ?? 1.0,
        isSurgeActive: demand?.isSurgeActive ?? false,
        estimatedPickupMin: demand?.estimatedPickupMin ?? 5,
      };
    });
  }, [mapData, zones]);

  const filteredZones = useMemo(() => {
    if (activeRegionFilter === 'ALL') return enrichedZones;
    return enrichedZones.filter((z) => z.region === activeRegionFilter);
  }, [enrichedZones, activeRegionFilter]);

  const originZone = useMemo(() => enrichedZones.find((z) => z.id === localOriginId) || enrichedZones[0], [enrichedZones, localOriginId]);
  const destZone = useMemo(() => enrichedZones.find((z) => z.id === localDestId) || enrichedZones[1], [enrichedZones, localDestId]);

  // Route calculation
  const routeDistanceKm = useMemo(() => {
    if (!originZone || !destZone || originZone.id === destZone.id) return 3.0;
    const d1 = originZone.distanceFromCenterKm || 0;
    const d2 = destZone.distanceFromCenterKm || 0;
    if (originZone.region === destZone.region) {
      return Math.max(3.0, Math.abs(d1 - d2));
    }
    return Math.max(5.0, d1 + d2);
  }, [originZone, destZone]);

  const routeDurationMin = useMemo(() => {
    return Math.max(6, Math.round(routeDistanceKm * 1.4));
  }, [routeDistanceKm]);

  const estimatedFare = useMemo(() => {
    const minFare = 20;
    const rateKm = 3.5;
    const dynamic = originZone?.multiplier || 1.0;
    const calc = Math.max(minFare, 10 + routeDistanceKm * rateKm) * dynamic;
    return Math.round(calc);
  }, [routeDistanceKm, originZone]);

  const handleZoneClick = (zone: Zone) => {
    setSelectedZone(zone);
    if (mode === 'PASSENGER') {
      if (!localOriginId || (localOriginId && localDestId)) {
        setLocalOriginId(zone.id);
        setLocalDestId('');
      } else {
        setLocalDestId(zone.id);
        if (onSelectRoute) {
          onSelectRoute(localOriginId, zone.id);
        }
      }
    }
  };

  const handleApplyPassengerRoute = () => {
    if (onSelectRoute && originZone && destZone) {
      onSelectRoute(originZone.id, destZone.id);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Map Header Toolbar */}
      <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span>Mapa de Mobilidade São Sebastião</span>
              {mode === 'PASSENGER' && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Passageiro
                </span>
              )}
              {mode === 'DRIVER' && (
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Demanda & Dinâmica
                </span>
              )}
              {mode === 'ADMIN' && (
                <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Operações & Frota
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Cobertura completa de Costa Norte, Centro e Costa Sul (SP-055)
            </p>
          </div>
        </div>

        {/* Region Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['ALL', 'NORTE', 'CENTRO', 'SUL'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setActiveRegionFilter(r)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                activeRegionFilter === r
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'Todas as Praias' : `Costa ${r.charAt(0) + r.slice(1).toLowerCase()}`}
            </button>
          ))}

          <button
            onClick={loadData}
            title="Atualizar dados do mapa"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin Mode Metrics Bar */}
      {mode === 'ADMIN' && (
        <div className="bg-slate-950/80 px-5 py-2.5 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Motoristas Online:</span>
            <strong className="text-white font-bold">{mapData?.onlineDrivers?.length ?? 5}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-slate-400">Corridas em Andamento:</span>
            <strong className="text-white font-bold">{mapData?.activeRides?.length ?? 1}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Zonas com Dinâmica:</span>
            <strong className="text-white font-bold">
              {enrichedZones.filter((z) => z.isSurgeActive).length}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Tempo Médio Resposta:</span>
            <strong className="text-white font-bold">~4 min</strong>
          </div>
        </div>
      )}

      {/* Main Map Interactive Canvas & Card Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Visual Map Representation (Left / Center) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative w-full h-[480px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">
            <Map
              id="vaicar-city-map"
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: -23.8078, lng: -45.4058 }}
              defaultZoom={11}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              <MobilityMapCameraController targetCenter={cameraTarget} targetZoom={cameraZoom} />

              {/* Zone / Beach Markers */}
              {enrichedZones.map((z) => {
                const isOrigin = z.id === localOriginId;
                const isDest = z.id === localDestId;
                const isSelected = selectedZone?.id === z.id;
                return (
                  <AdvancedMarker
                    key={`map-zone-${z.id}`}
                    position={{ lat: z.lat, lng: z.lng }}
                    title={z.name}
                    onClick={() => handleZoneClick(z)}
                  >
                    <div className="cursor-pointer flex flex-col items-center group">
                      <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border whitespace-nowrap ${
                          isOrigin
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-105 shadow-emerald-500/30'
                            : isDest
                            ? 'bg-sky-500 text-slate-950 border-sky-300 scale-105 shadow-sky-500/30'
                            : isSelected
                            ? 'bg-slate-800 text-white border-emerald-500 scale-105'
                            : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-emerald-400 hover:text-white'
                        }`}
                      >
                        <MapPin
                          className={`w-3.5 h-3.5 ${
                            isOrigin || isDest ? 'text-slate-950' : 'text-emerald-400'
                          }`}
                        />
                        <span>{z.name}</span>
                        {z.isSurgeActive && <span className="text-[10px]">⚡{z.multiplier}x</span>}
                        {z.onlineDrivers > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Online Drivers Markers */}
              {showOnlineDrivers &&
                mapData?.onlineDrivers?.map((d: any) => {
                  if (!d.lat || !d.lng) return null;
                  return (
                    <AdvancedMarker
                      key={`mobility-driver-${d.id}`}
                      position={{ lat: d.lat, lng: d.lng }}
                      title={`Motorista: ${d.name}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-400 border border-emerald-400 flex items-center justify-center shadow-lg">
                        <Car className="w-4 h-4" />
                      </div>
                    </AdvancedMarker>
                  );
                })}
            </Map>

            {/* Top Info Floating Pills */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] text-slate-300 font-semibold flex items-center gap-2 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Canal de São Sebastião & Ilhabela</span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 pointer-events-auto">
                <Navigation className="w-3 h-3" />
                <span>Rodovia Rio-Santos (SP-055)</span>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="bg-slate-950/90 border-t border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 z-10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Origem</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>Destino</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Alta Procura (⚡)</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Clique nos pontos do mapa para selecionar origem e destino
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Panel: Route / Demand Details */}
        <div className="lg:col-span-4 space-y-4">
          {mode === 'PASSENGER' && (
            <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Rota Selecionada
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Estimativa Real
                </span>
              </div>

              {/* Origin & Destination Selectors */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Local de Embarque
                  </label>
                  <select
                    value={localOriginId}
                    onChange={(e) => setLocalOriginId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {enrichedZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (Costa {z.region.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Local de Desembarque
                  </label>
                  <select
                    value={localDestId}
                    onChange={(e) => setLocalDestId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {enrichedZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} (Costa {z.region.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Route Metrics Preview */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Distância</span>
                  <strong className="text-xs text-white font-bold">{routeDistanceKm.toFixed(1)} km</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Tempo Estimado</span>
                  <strong className="text-xs text-white font-bold">{routeDurationMin} min</strong>
                </div>
              </div>

              {/* Fare Banner */}
              <div className="bg-emerald-950/60 border border-emerald-500/40 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 block">Tarifa Estimada</span>
                  <span className="text-lg font-black text-emerald-400">R$ {estimatedFare},00</span>
                </div>
                {originZone?.isSurgeActive && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-1 rounded-lg border border-amber-500/30">
                    ⚡ {originZone.multiplier}x Dinâmica
                  </span>
                )}
              </div>

              <button
                onClick={handleApplyPassengerRoute}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>Pedir Corrida Nesta Rota</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {mode === 'DRIVER' && (
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Oportunidades de Alta Demanda
                </h4>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {enrichedZones
                  .sort((a, b) => (b.multiplier || 1) - (a.multiplier || 1))
                  .slice(0, 6)
                  .map((z) => (
                    <div
                      key={z.id}
                      className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-white block">{z.name}</strong>
                        <span className="text-[11px] text-slate-400">
                          {z.onlineDrivers} motoristas na área
                        </span>
                      </div>
                      <div className="text-right">
                        {z.isSurgeActive ? (
                          <span className="text-xs font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-500/30">
                            ⚡ {z.multiplier}x
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold">Normal</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Posicione-se próximo a bairros com multiplicador ativo para receber chamadas com valores aumentados.
                </span>
              </div>
            </div>
          )}

          {mode === 'ADMIN' && (
            <div className="bg-slate-950/70 border border-sky-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Monitor de Operações
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Total de Bairros Atendidos:</span>
                  <strong className="text-white font-bold">{enrichedZones.length} zonas</strong>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Frota Ativa Online:</span>
                  <strong className="text-emerald-400 font-bold">{mapData?.onlineDrivers?.length ?? 5} motoristas</strong>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Algoritmo Dinâmico:</span>
                  <strong className="text-amber-400 font-bold">Ativo (0.8x a 2.5x)</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
