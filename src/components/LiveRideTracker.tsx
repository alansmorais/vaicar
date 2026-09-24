import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Car, 
  Navigation, 
  Compass, 
  Clock, 
  CheckCircle2, 
  Shield, 
  TrendingUp, 
  PhoneCall, 
  ChevronRight,
  Info,
  XCircle,
  RotateCcw,
  AlertCircle,
  Banknote,
  Send
} from 'lucide-react';
import { Ride } from '../types.ts';
import { contestRidePayment } from '../lib/api.ts';

interface LiveRideTrackerProps {
  ride: Ride;
  onDismiss?: () => void;
}

export function LiveRideTracker({ ride, onDismiss }: LiveRideTrackerProps) {
  const [progress, setProgress] = useState(0.1);
  const [simulatedEtaMin, setSimulatedEtaMin] = useState(ride.estimatedDurationMin);
  const [simulatedDistanceKm, setSimulatedDistanceKm] = useState(ride.estimatedDistanceKm);
  const [isContesting, setIsContesting] = useState(false);
  const [contestReason, setContestReason] = useState('');
  const [isSubmittingContest, setIsSubmittingContest] = useState(false);
  const [contestSuccessMsg, setContestSuccessMsg] = useState('');
  const animationRef = useRef<number | null>(null);

  const driverFirstName = ride.driverName?.split(' ')[0] || 'Motorista';
  const originName = ride.originAddress.split(',')[0];
  const destName = ride.destinationAddress.split(',')[0];

  // If the ride is cancelled, rejected or expired, do NOT render the map trajectory or animated car
  if (ride.status.startsWith('CANCELLED') || ride.status === 'REJECTED' || ride.status === 'EXPIRED') {
    return (
      <div className="bg-slate-950/60 rounded-2xl border border-rose-500/30 overflow-hidden shadow-xl p-6 sm:p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-500/30 uppercase tracking-widest">
            Corrida Cancelada
          </span>
          <h3 className="text-xl font-black text-white pt-1">
            {ride.status === 'CANCELLED_BY_DRIVER' ? 'O motorista não pôde atender a esta chamada' : 'Esta corrida foi cancelada'}
          </h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {ride.cancellationReason
              ? `Motivo informado: "${ride.cancellationReason}"`
              : 'O trajeto foi interrompido e você não foi cobrado.'}
          </p>
        </div>

        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs text-slate-300 max-w-sm mx-auto space-y-1 text-left">
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Origem: <strong className="text-white">{originName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Destino: <strong className="text-white">{destName}</strong></span>
          </div>
        </div>

        {onDismiss && (
          <div className="pt-2">
            <button
              onClick={onDismiss}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>Solicitar Nova Corrida</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Define physical positions based on ride status
  // 1. DRIVER_ARRIVING: Driver moving from a mock start point to origin
  // 2. IN_PROGRESS: Driver moving from origin to destination
  useEffect(() => {
    let startTime = Date.now();
    let durationMs = 120 * 1000; // Let's simulate the movement over 2 minutes for demo purposes, so it's super visible!
    
    if (ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
      durationMs = 60 * 1000; // Driver arrives in 1 minute
    } else if (ride.status === 'IN_PROGRESS') {
      durationMs = 120 * 1000; // Ride duration 2 minutes
    } else if (ride.status === 'COMPLETED') {
      setProgress(1.0);
      setSimulatedEtaMin(0);
      setSimulatedDistanceKm(0);
      return;
    } else {
      setProgress(0);
      return;
    }

    const updateSimulation = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const computedProgress = Math.min(1.0, elapsed / durationMs);
      
      setProgress(computedProgress);

      // Interpolate ETA and Distance
      if (ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
        const remainingDist = Math.max(0.1, (1 - computedProgress) * 2.5); // Starts 2.5km away
        setSimulatedDistanceKm(parseFloat(remainingDist.toFixed(1)));
        setSimulatedEtaMin(Math.max(1, Math.round((1 - computedProgress) * 5))); // Starts at 5 mins
      } else if (ride.status === 'IN_PROGRESS') {
        const remainingDist = Math.max(0.1, (1 - computedProgress) * ride.estimatedDistanceKm);
        setSimulatedDistanceKm(parseFloat(remainingDist.toFixed(1)));
        setSimulatedEtaMin(Math.max(1, Math.round((1 - computedProgress) * ride.estimatedDurationMin)));
      }

      if (computedProgress < 1.0) {
        animationRef.current = requestAnimationFrame(updateSimulation);
      }
    };

    animationRef.current = requestAnimationFrame(updateSimulation);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [ride.status, ride.id]);

  // Draw simulated path points in SVG
  const width = 500;
  const height = 180;
  
  // Curved road from left to right (represents SP-055 Rio-Santos highway)
  const pathData = `M 50,90 Q 150,40 250,90 T 450,90`;

  // Get point along SVG path for the car's current progress
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [carPos, setCarPos] = useState({ x: 100, y: 70, angle: 0 });

  useEffect(() => {
    if (svgRef.current) {
      const pathElement = svgRef.current.querySelector('path');
      if (pathElement) {
        try {
          const pathLength = pathElement.getTotalLength();
          
          // Determine path segment depending on status
          let currentPathProgress = 0;
          if (ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING') {
            // Driver is arriving, moves from start (0) to origin (0.4 of total path)
            currentPathProgress = progress * 0.4;
          } else if (ride.status === 'PASSENGER_PICKED_UP') {
            // Driver is at origin (0.4)
            currentPathProgress = 0.4;
          } else if (ride.status === 'IN_PROGRESS') {
            // Driver moves from origin (0.4) to destination (0.95)
            currentPathProgress = 0.4 + (progress * 0.55);
          } else if (ride.status === 'COMPLETED') {
            currentPathProgress = 0.95;
          }

          const point = pathElement.getPointAtLength(currentPathProgress * pathLength);
          
          // Angle calculation for car direction rotation
          const deltaPoint = pathElement.getPointAtLength(Math.min(pathLength, currentPathProgress * pathLength + 1));
          const angle = Math.atan2(deltaPoint.y - point.y, deltaPoint.x - point.x) * (180 / Math.PI);
          
          setCarPos({ x: point.x, y: point.y, angle });
        } catch (e) {
          // Fallback if SVG API isn't fully ready
          const fallbackX = 50 + progress * 400;
          setCarPos({ x: fallbackX, y: 90, angle: 0 });
        }
      }
    }
  }, [progress, ride.status]);

  // Status messages and descriptions
  const getStatusDetails = () => {
    switch (ride.status) {
      case 'REQUESTED':
        return {
          title: 'Aguardando confirmação',
          desc: 'Enviando chamada ao cockpit do motorista...',
          color: 'text-amber-400 bg-amber-950/40 border-amber-500/20',
          step: 1
        };
      case 'ACCEPTED':
        return {
          title: 'Chamada Aceita!',
          desc: `${ride.driverName} aceitou sua chamada e está preparando o veículo.`,
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20',
          step: 2
        };
      case 'DRIVER_ARRIVING':
        return {
          title: 'Motorista a caminho!',
          desc: `${ride.driverName} está conduzindo o ${ride.driverVehicle} em direção ao seu local de embarque.`,
          color: 'text-sky-400 bg-sky-950/40 border-sky-500/20',
          step: 3
        };
      case 'PASSENGER_PICKED_UP':
        return {
          title: 'Você Embarcou!',
          desc: 'Aguardando o início da viagem pelo motorista.',
          color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/20',
          step: 4
        };
      case 'IN_PROGRESS':
        return {
          title: 'Viagem em andamento',
          desc: `Dirigindo com segurança até ${destName}. Curta sua viagem!`,
          color: 'text-teal-400 bg-teal-950/40 border-teal-500/20',
          step: 5
        };
      case 'COMPLETED':
        return {
          title: 'Viagem Concluída',
          desc: 'Você chegou ao seu destino! Por favor, efetue o pagamento diretamente ao motorista.',
          color: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
          step: 6
        };
      default:
        return {
          title: 'Processando viagem',
          desc: 'Sincronizando dados com a plataforma...',
          color: 'text-slate-400 bg-slate-900',
          step: 1
        };
    }
  };

  const statusInfo = getStatusDetails();

  return (
    <div className="bg-slate-950/50 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
      {/* Live Map Box */}
      <div className="p-4 bg-slate-950 relative overflow-hidden h-[240px] flex flex-col justify-between border-b border-slate-900">
        
        {/* Map Header with Real-time GPS watermark */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
            <Compass className="w-3.5 h-3.5 spin-slow" />
            <span>Sinal GPS Ativo</span>
          </div>
          
          <div className="text-[10px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/60 font-mono">
            SS-GPS // LAT: {carPos.y.toFixed(4)} Lng: {carPos.x.toFixed(4)}
          </div>
        </div>

        {/* The Map Canvas (SVG) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-90 py-4">
          <svg 
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full max-h-[180px] pointer-events-none select-none"
          >
            {/* Grid Pattern Background for techy radar map look */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(30, 41, 59, 0.25)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Ocean outline representing São Sebastião Coast */}
            <path 
              d="M 0,130 C 120,130 180,160 300,120 T 500,150" 
              fill="none" 
              stroke="rgba(14, 116, 144, 0.15)" 
              strokeWidth="20" 
              strokeLinecap="round" 
            />

            {/* Scenic Landmarks along the road */}
            <text x="130" y="55" fill="rgba(100, 116, 139, 0.4)" fontSize="8" fontWeight="bold" className="font-sans">SERRA DO MAR</text>
            <text x="280" y="150" fill="rgba(14, 116, 144, 0.3)" fontSize="8" fontWeight="bold" className="font-sans">OCEANO ATLÂNTICO</text>

            {/* The Rio-Santos Highway Road Line (Shadow & Core) */}
            <path 
              d={pathData} 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="8" 
              strokeLinecap="round" 
            />
            <path 
              d={pathData} 
              fill="none" 
              stroke="#0f172a" 
              strokeWidth="6" 
              strokeLinecap="round" 
            />
            <path 
              d={pathData} 
              fill="none" 
              stroke="#eab308" 
              strokeWidth="0.8" 
              strokeDasharray="4 4" 
              strokeLinecap="round" 
            />

            {/* Driver Start Base Marker */}
            <circle cx="50" cy="90" r="4" fill="#475569" className="animate-ping" />
            <circle cx="50" cy="90" r="3" fill="#64748b" />
            <text x="45" y="105" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">Base</text>

            {/* Passenger PICKUP Point (Origin) */}
            <g transform="translate(210, 75)">
              <circle cx="0" cy="0" r="8" fill="rgba(16, 185, 129, 0.15)" className="animate-ping" />
              <circle cx="0" cy="0" r="5" fill="#10b981" />
              <text x="0" y="15" fill="#10b981" fontSize="9" fontWeight="black" textAnchor="middle">{originName}</text>
            </g>

            {/* DESTINATION Point (Finish) */}
            <g transform="translate(425, 90)">
              <circle cx="0" cy="0" r="8" fill="rgba(6, 182, 212, 0.15)" />
              <path d="M-4,-4 L4,4 M4,-4 L-4,4" stroke="#06b6d4" strokeWidth="2" />
              <circle cx="0" cy="0" r="4" fill="#06b6d4" />
              <text x="0" y="15" fill="#06b6d4" fontSize="9" fontWeight="black" textAnchor="middle">{destName}</text>
            </g>

            {/* THE VEHICLE (Moving Car) */}
            <g transform={`translate(${carPos.x}, ${carPos.y}) rotate(${carPos.angle})`}>
              {/* Pulsing radar range ring */}
              <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="1" className="animate-pulse" />
              
              {/* Car Body Shadow */}
              <rect x="-9" y="-6" width="18" height="12" rx="3" fill="rgba(15, 23, 42, 0.5)" />
              
              {/* Car Body Core */}
              <rect x="-8" y="-5" width="16" height="10" rx="2" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
              
              {/* Windshield */}
              <rect x="2" y="-3.5" width="3" height="7" rx="0.5" fill="#0f172a" />
              
              {/* Headlights */}
              <circle cx="7" cy="-3" r="1" fill="#fff" />
              <circle cx="7" cy="3" r="1" fill="#fff" />
              
              {/* Tail lights */}
              <rect x="-8" y="-4" width="1" height="2" fill="#ef4444" />
              <rect x="-8" y="2" width="1" height="2" fill="#ef4444" />
            </g>
          </svg>
        </div>

        {/* Map Footer overlay containing progress bar */}
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 z-10 flex items-center justify-between gap-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <Car className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Status do Carro</span>
              <span className="text-xs font-black text-white">
                {ride.status === 'ACCEPTED' || ride.status === 'DRIVER_ARRIVING' ? `${driverFirstName} a caminho do embarque` : ''}
                {ride.status === 'PASSENGER_PICKED_UP' ? 'Aguardando partida' : ''}
                {ride.status === 'IN_PROGRESS' ? 'Em direção ao destino' : ''}
                {ride.status === 'COMPLETED' ? 'Chegou ao destino' : ''}
                {ride.status === 'REQUESTED' ? `Aguardando confirmação de ${driverFirstName}...` : ''}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1 text-emerald-400 font-black text-sm">
              <Clock className="w-4 h-4" />
              <span>~{simulatedEtaMin} min</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-bold">{simulatedDistanceKm} km restantes</span>
          </div>
        </div>

      </div>

      {/* Live Status and Next steps */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Status indicator banner */}
        <div className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${statusInfo.color}`}>
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-black text-sm text-white">{statusInfo.title}</h4>
            <p className="text-xs leading-relaxed opacity-90">{statusInfo.desc}</p>
          </div>
        </div>

        {/* Timeline of milestones */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso da Viagem</h4>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tempo Real Ativo
            </span>
          </div>
          
          <div className="relative border-l-2 border-slate-800 ml-3.5 pl-5 space-y-4 text-xs">
            
            {/* Step 1: Requested */}
            <div className="relative">
              <span className="absolute -left-[27px] top-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950 stroke-[2.5]" />
              </span>
              <div>
                <span className="font-bold text-white block">Viagem Solicitada</span>
                <span className="text-[10px] text-slate-400 block">Sua solicitação de embarque foi criada</span>
              </div>
            </div>

            {/* Step 2: Accepted */}
            <div className="relative">
              {statusInfo.step > 2 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950 stroke-[2.5]" />
                </span>
              ) : statusInfo.step === 2 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </span>
              ) : (
                <span className="absolute -left-[27px] top-0.5 bg-slate-900 border border-slate-700/80 rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                </span>
              )}
              <div className={statusInfo.step >= 2 ? '' : 'opacity-40'}>
                <span className="font-bold text-white block">Motorista Confirmado</span>
                <span className="text-[10px] text-slate-400 block">{driverFirstName} aceitou seu convite</span>
              </div>
            </div>

            {/* Step 3: Arriving */}
            <div className="relative">
              {statusInfo.step > 3 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950 stroke-[2.5]" />
                </span>
              ) : statusInfo.step === 3 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </span>
              ) : (
                <span className="absolute -left-[27px] top-0.5 bg-slate-900 border border-slate-700/80 rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                </span>
              )}
              <div className={statusInfo.step >= 3 ? '' : 'opacity-40'}>
                <span className="font-bold text-white block">Motorista no Local de Embarque</span>
                <span className="text-[10px] text-slate-400 block">{driverFirstName} chegando com o veículo</span>
              </div>
            </div>

            {/* Step 4: Picked up & In Progress */}
            <div className="relative">
              {statusInfo.step >= 6 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950 stroke-[2.5]" />
                </span>
              ) : statusInfo.step >= 4 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </span>
              ) : (
                <span className="absolute -left-[27px] top-0.5 bg-slate-900 border border-slate-700/80 rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                </span>
              )}
              <div className={statusInfo.step >= 4 ? '' : 'opacity-40'}>
                <span className="font-bold text-white block">Viagem em Andamento</span>
                <span className="text-[10px] text-slate-400 block">Deslocamento monitorado pela plataforma em tempo real</span>
              </div>
            </div>

            {/* Step 5: Completed */}
            <div className="relative">
              {statusInfo.step >= 6 ? (
                <span className="absolute -left-[27px] top-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-400 text-slate-950 stroke-[2.5]" />
                </span>
              ) : (
                <span className="absolute -left-[27px] top-0.5 bg-slate-900 border border-slate-700/80 rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                </span>
              )}
              <div className={statusInfo.step >= 6 ? '' : 'opacity-40'}>
                <span className="font-bold text-white block">Destino e Pagamento</span>
                <span className="text-[10px] text-slate-400 block">Chegada ao destino final e acerto direto</span>
              </div>
            </div>

          </div>
        </div>

        {/* Real GPS Navigation Links for Driver / Passenger */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Navegação GPS em Tempo Real
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
              Motorista & Passageiro
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ride.originAddress)}&destination=${encodeURIComponent(ride.destinationAddress)}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold text-xs py-2 px-3 rounded-xl border border-slate-800 hover:border-sky-500/40 transition-all text-center"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Google Maps ↗</span>
            </a>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(ride.destinationAddress)}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-2 px-3 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition-all text-center"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>Waze ↗</span>
            </a>
          </div>

          {ride.originMapsLink && (
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Ponto GPS exato de embarque:</span>
              <a
                href={ride.originMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold inline-flex items-center gap-1"
              >
                📍 Ver Ponto Exato no Mapa ↗
              </a>
            </div>
          )}
        </div>

        {/* Payment Confirmation & Unpaid Control for Completed Ride */}
        {ride.status === 'COMPLETED' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Status do Pagamento da Corrida
              </span>
              <span className="text-sm font-black text-emerald-400">
                R$ {(ride.fareBrl !== undefined ? ride.fareBrl : ride.estimatedPrice).toFixed(2).replace('.', ',')}
              </span>
            </div>

            {ride.paymentStatus === 'PAID' || ride.paymentStatus === 'CONFIRMED_BY_DRIVER' ? (
              <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <strong className="block font-bold text-emerald-200">Pagamento Confirmado pelo Motorista</strong>
                  <span className="text-[11px] text-emerald-400/80">Recebido via {ride.paymentMethod || 'Direto'} • Nenhuma pendência em aberto</span>
                </div>
              </div>
            ) : ride.paymentStatus === 'PAYMENT_PENDING' ? (
              <div className="space-y-3">
                <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Pagamento Não Confirmado pelo Motorista</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    O motorista marcou que este pagamento ainda está pendente. Enquanto houver pendência financeira, novas corridas não poderão ser solicitadas.
                  </p>
                  {ride.paymentPendingReason && (
                    <p className="text-[11px] text-rose-300 font-medium">
                      Motivo informado: {ride.paymentPendingReason}
                    </p>
                  )}
                </div>

                {!isContesting && !contestSuccessMsg && (
                  <button
                    type="button"
                    onClick={() => setIsContesting(true)}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    💬 Já paguei / Contestar Cobrança com a Moderação
                  </button>
                )}

                {isContesting && (
                  <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl space-y-2.5 text-xs">
                    <span className="font-bold text-white block">Contestação de Pagamento:</span>
                    <textarea
                      value={contestReason}
                      onChange={(e) => setContestReason(e.target.value)}
                      placeholder="Descreva como e quando você realizou o pagamento (ex: Pix enviado às 14:30 / Dinheiro entregue em mãos)..."
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsContesting(false)}
                        disabled={isSubmittingContest}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!contestReason.trim()) return alert('Informe o motivo da contestação.');
                          try {
                            setIsSubmittingContest(true);
                            await contestRidePayment(ride.id, contestReason.trim(), undefined, ride.passengerPhone);
                            setContestSuccessMsg('Contestação enviada com sucesso! A administração analisará seu caso.');
                            setIsContesting(false);
                          } catch (err: any) {
                            alert(err.message || 'Erro ao enviar contestação');
                          } finally {
                            setIsSubmittingContest(false);
                          }
                        }}
                        disabled={isSubmittingContest}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2 rounded-lg cursor-pointer"
                      >
                        {isSubmittingContest ? 'Enviando...' : 'Enviar Contestação'}
                      </button>
                    </div>
                  </div>
                )}

                {contestSuccessMsg && (
                  <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300">
                    {contestSuccessMsg}
                  </div>
                )}
              </div>
            ) : ride.paymentStatus === 'PAYMENT_CONTESTED' ? (
              <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 text-xs space-y-1">
                <span className="font-bold text-amber-300 block">⏳ Pagamento em Análise / Contestado</span>
                <p className="text-[11px] text-slate-300">
                  Sua contestação foi registrada e está sob auditoria da administração. Motivo: "{ride.contestReason || 'Em análise'}"
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Safety & Identification Guidance */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900/80 flex items-center gap-2.5 text-[10px] text-slate-400">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Verificação e Segurança:</strong> Confira se o motorista, a placa e o veículo correspondem aos dados do app. Motorista e passageiro devem respeitar as regras de segurança.
          </span>
        </div>

      </div>
    </div>
  );
}
