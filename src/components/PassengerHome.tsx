import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Car,
  Navigation,
} from 'lucide-react';
import { Zone } from '../types.ts';

interface PassengerHomeProps {
  zones: Zone[];
  onSearch: (originId: string, destId: string, passengers: number, scheduleTime?: string) => void;
  isLoading: boolean;
  onGoToDriverSignup: () => void;
}

export const PassengerHome: React.FC<PassengerHomeProps> = ({
  zones,
  onSearch,
  isLoading,
  onGoToDriverSignup,
}) => {
  const [originZoneId, setOriginZoneId] = useState<string>(zones[8]?.id || 'z-maresias'); // Default Maresias
  const [destinationZoneId, setDestinationZoneId] = useState<string>(zones[0]?.id || 'z-centro'); // Default Centro
  const [passengers, setPassengers] = useState<number>(1);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledTime, setScheduledTime] = useState<string>('14:30');
  const [gpsDetecting, setGpsDetecting] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const handleDetectGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    setGpsDetecting(true);
    setGpsStatus('Obtendo sinal GPS dos satélites...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsDetecting(false);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let closestZone = zones[0];
        let minDistance = Infinity;

        for (const z of zones) {
          if (typeof z.lat === 'number' && typeof z.lng === 'number') {
            const dLat = (z.lat - userLat) * (Math.PI / 180);
            const dLng = (z.lng - userLng) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(userLat * (Math.PI / 180)) *
                Math.cos(z.lat * (Math.PI / 180)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = 6371 * c; // Earth radius in km
            if (dist < minDistance) {
              minDistance = dist;
              closestZone = z;
            }
          }
        }

        if (closestZone) {
          setOriginZoneId(closestZone.id);
          setGpsStatus(`📍 GPS Detectado: ${closestZone.name} (~${minDistance.toFixed(1)} km)`);
          setTimeout(() => setGpsStatus(null), 5000);
        }
      },
      (err) => {
        setGpsDetecting(false);
        setGpsStatus(null);
        alert('Não foi possível obter sua localização GPS. Verifique a permissão do seu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(
      originZoneId,
      destinationZoneId,
      passengers,
      scheduleType === 'LATER' ? scheduledTime : undefined,
    );
  };

  const handleQuickRoute = (origSlug: string, destSlug: string) => {
    const orig = zones.find((z) => z.slug === origSlug);
    const dest = zones.find((z) => z.slug === destSlug);
    if (orig && dest) {
      setOriginZoneId(orig.id);
      setDestinationZoneId(dest.id);
      onSearch(orig.id, dest.id, passengers);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-10">
      {/* Hero Headline */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transporte Remunerado Legalizado em São Sebastião</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Transporte local em <span className="text-emerald-400">São Sebastião</span>
        </h1>
        <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto">
          Encontre motoristas profissionais disponíveis perto de você. Sem intermediários cobrando comissão sobre a sua corrida.
        </p>
      </div>

      {/* Main Search Card (Mobile-First Ergonomics) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin Zone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  De onde? (Local de partida)
                </label>
                <button
                  type="button"
                  onClick={handleDetectGpsLocation}
                  disabled={gpsDetecting}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Detectar sua localização atual via GPS do celular/computador"
                >
                  <Navigation className={`w-3 h-3 ${gpsDetecting ? 'animate-spin text-emerald-300' : ''}`} />
                  <span>{gpsDetecting ? 'Obtendo GPS...' : 'Usar Meu GPS'}</span>
                </button>
              </div>

              {gpsStatus && (
                <div className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-lg animate-in fade-in flex items-center gap-1">
                  <span>{gpsStatus}</span>
                </div>
              )}

              <div className="relative">
                <select
                  id="origin-zone-select"
                  value={originZoneId}
                  onChange={(e) => setOriginZoneId(e.target.value)}
                  className="w-full bg-slate-950 text-white font-medium px-4 py-3.5 rounded-xl border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer text-sm"
                >
                  {zones.map((zone) => (
                    <option key={`orig-${zone.id}`} value={zone.id}>
                      📍 {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Zone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Para onde? (Destino)
              </label>
              <div className="relative">
                <select
                  id="destination-zone-select"
                  value={destinationZoneId}
                  onChange={(e) => setDestinationZoneId(e.target.value)}
                  className="w-full bg-slate-950 text-white font-medium px-4 py-3.5 rounded-xl border border-slate-700/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer text-sm"
                >
                  {zones.map((zone) => (
                    <option key={`dest-${zone.id}`} value={zone.id}>
                      🏁 {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time & Passenger Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* When */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Quando?
              </label>
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setScheduleType('NOW')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scheduleType === 'NOW'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agora
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('LATER')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scheduleType === 'LATER'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Escolher horário
                </button>
              </div>
              {scheduleType === 'LATER' && (
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full mt-2 bg-slate-950 text-white px-3 py-2 rounded-lg border border-slate-700 text-sm outline-none focus:border-emerald-500"
                />
              )}
            </div>

            {/* Passengers count */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-violet-400" />
                Passageiros
              </label>
              <div className="flex items-center justify-between bg-slate-950 px-4 py-2 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-lg"
                >
                  -
                </button>
                <span className="font-extrabold text-white text-base">
                  {passengers} {passengers === 1 ? 'passageiro' : 'passageiros'}
                </span>
                <button
                  type="button"
                  onClick={() => setPassengers(Math.min(6, passengers + 1))}
                  className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-lg"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Main CTA Search Button */}
          <button
            id="search-drivers-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base py-4 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Buscando motoristas em São Sebastião...
              </span>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>PROCURAR MOTORISTAS</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Popular Routes Quick Buttons */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
          Rotas Mais Procuradas no Litoral de São Sebastião
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { label: 'Centro ➔ Maresias', orig: 'centro', dest: 'maresias' },
            { label: 'Maresias ➔ Centro', orig: 'maresias', dest: 'centro' },
            { label: 'Juquehy ➔ Maresias', orig: 'juquehy', dest: 'maresias' },
            { label: 'Centro ➔ Barequeçaba', orig: 'centro', dest: 'barequecaba' },
            { label: 'Boiçucanga ➔ Camburi', orig: 'boicucanga', dest: 'camburi' },
            { label: 'Centro ➔ São Francisco', orig: 'centro', dest: 'sao-francisco' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickRoute(item.orig, item.dest)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-300 hover:text-emerald-400 px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{item.label}</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* Como Funciona Section */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Como funciona o VaiCar</h2>
          <p className="text-slate-400 text-xs">Simples, direto e transparente</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base border border-emerald-500/30">
              1
            </div>
            <h4 className="font-bold text-white text-sm">Informe seu destino</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Digite seu local de partida e para onde vai nas praias ou centro de São Sebastião. Sem cadastro prévio obrigatório.
            </p>
          </div>

          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-base border border-teal-500/30">
              2
            </div>
            <h4 className="font-bold text-white text-sm">Escolha um motorista</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compare opções reais: modelo do carro, preço, avaliação média e tempo de chegada. Informações objetivas.
            </p>
          </div>

          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-base border border-cyan-500/30">
              3
            </div>
            <h4 className="font-bold text-white text-sm">Solicite sua corrida</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Acompanhe o status e fale diretamente pelo WhatsApp com o motorista credenciado. Pague direto a ele.
            </p>
          </div>
        </div>
      </div>

      {/* Driver Onboarding Promotion Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Para Motoristas Autorizados de São Sebastião</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Você define seu preço. Você fica com 100% da corrida.
          </h3>
          <p className="text-xs text-slate-300 max-w-lg">
            Sem taxa percentual por corrida. Mensalidade a partir de <strong>R$ 0/mês</strong> (1º cadastro grátis, R$ 60 para os 9 seguintes) e receba chamadas diretamente de passageiros locais e turistas.
          </p>
        </div>
        <button
          onClick={onGoToDriverSignup}
          className="whitespace-nowrap bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <span>QUERO SER MOTORISTA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
