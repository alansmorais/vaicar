import React, { useState, useEffect, useRef } from 'react';
import {
  Power,
  Star,
  DollarSign,
  Car,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  MapPin,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  Phone,
  MessageSquare,
  Award,
  Zap,
  Banknote,
  CreditCard,
  Wallet,
  Copy,
  Check,
  Bell,
  Volume2,
  VolumeX,
  Scale,
  Navigation,
  Sparkles,
  Package,
} from 'lucide-react';
import { Driver, Zone, Ride, RegulatoryRequirement, PaymentMethod, PlatformFareSettings } from '../types.ts';
import { realtimeSync, broadcastLocalRideUpdate } from '../lib/realtimeSync.ts';
import { LegalModal } from './LegalModal.tsx';
import {
  updateDriverAvailability,
  updateDriverPricing,
  submitDriverDocument,
  updateRideStatus,
  getWhatsAppContact,
  updateDriverPaymentSettings,
  updateRidePaymentStatus,
  fetchFareSettings,
  createZone,
} from '../lib/api.ts';

export function parseDeliveryDetails(originLandmark?: string) {
  if (!originLandmark || !originLandmark.startsWith('📦 [DELIVERY')) {
    return null;
  }
  const isMoto = originLandmark.includes('DELIVERY - MOTO');
  const isBike = originLandmark.includes('DELIVERY - BIKE');
  
  const extractField = (fieldName: string) => {
    const regex = new RegExp(`${fieldName}:\\s*([^|]+)`);
    const match = originLandmark.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    vehicleType: isMoto ? 'Motocicleta 🏍️' : (isBike ? 'Bicicleta 🚲' : 'Entrega Expressa 📦'),
    category: extractField('Categoria'),
    description: extractField('Descrição'),
    weight: extractField('Peso'),
    size: extractField('Tamanho'),
    declaredValue: extractField('Valor Decl'),
    fullString: originLandmark
  };
}

interface DriverCockpitProps {
  driver: Driver;
  allZones: Zone[];
  requirements: RegulatoryRequirement[];
  rides: Ride[];
  monthlyPlanPrice: number;
  onRefreshDriver: (updated: Driver) => void;
  onRefreshRides: () => void;
  onGoToSubscription: () => void;
}

export const DriverCockpit: React.FC<DriverCockpitProps> = ({
  driver,
  allZones,
  requirements,
  rides,
  monthlyPlanPrice,
  onRefreshDriver,
  onRefreshRides,
  onGoToSubscription,
}) => {
  if (driver.status === 'PENDING') {
    return (
      <div className="max-w-lg mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <h3 className="text-xl font-black text-white">Cadastro em Análise</h3>
        <p className="text-sm text-slate-400">
          Sua documentação foi enviada e está sendo analisada pela nossa equipe.
          Em breve você receberá uma notificação sobre a aprovação.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'PANEL' | 'PRICING' | 'PAYMENTS' | 'ZONES' | 'DOCS'>('PANEL');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // Payment settings state
  const [pixKey, setPixKey] = useState(driver.pixKey || driver.phone || '');
  const [pixKeyType, setPixKeyType] = useState(driver.pixKeyType || 'PHONE');
  const [acceptsCardMachine, setAcceptsCardMachine] = useState(driver.acceptsCardMachine ?? true);
  const [paymentSaveSuccess, setPaymentSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Pricing form state
  const [minFare, setMinFare] = useState(driver.pricing.minimumFare || 25);
  const [rateKm, setRateKm] = useState(driver.pricing.ratePerKm || 3.5);
  const [pricingType, setPricingType] = useState(driver.pricing.pricingType || 'KM_ONLY');
  const [fixedRoutes, setFixedRoutes] = useState(driver.pricing.fixedRoutes || []);
  const [newOrigZone, setNewOrigZone] = useState(allZones[0]?.id || '');
  const [newDestZone, setNewDestZone] = useState(allZones[1]?.id || '');
  const [newRoutePrice, setNewRoutePrice] = useState(40);

  // Custom zones management state
  const [customZonesList, setCustomZonesList] = useState<Zone[]>(allZones);
  const [newZoneInput, setNewZoneInput] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [zoneActionMessage, setZoneActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCustomZonesList((prev) => {
      const mergedMap = new Map<string, Zone>();
      allZones.forEach((z) => mergedMap.set(z.id, z));
      prev.forEach((z) => mergedMap.set(z.id, z));
      return Array.from(mergedMap.values());
    });
  }, [allZones]);

  // Platform fare floor state
  const [fareSettings, setFareSettings] = useState<PlatformFareSettings>({
    minBaseFare: 15.0,
    minRatePerKm: 3.0,
    minFixedRoutePrice: 25.0,
    isEnforced: true,
  });

  useEffect(() => {
    fetchFareSettings().then(setFareSettings).catch(() => {});
  }, []);

  // Sound and alert notification state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNotifPermission, setHasNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Synthesized Web Audio chime (pleasant 4-tone bell)
  const playRideChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';

      const now = ctx.currentTime;
      // Melody: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      osc.frequency.setValueAtTime(1046.5, now + 0.36);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch {
      // AudioContext policy fallback
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setHasNotifPermission(perm === 'granted');
      if (perm === 'granted') {
        playRideChime();
        alert('Notificações ativadas! Você ouvirá um alerta sonoro a cada nova corrida.');
      }
    }
  };

  // Filter rides for this driver (sort newest first so activeRide is always the latest)
  const driverRides = rides
    .filter((r) => r.driverId === driver.id)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const pendingRequests = driverRides.filter((r) => r.status === 'REQUESTED');
  const activeRide = driverRides.find((r) =>
    ['ACCEPTED', 'DRIVER_ARRIVING', 'PASSENGER_PICKED_UP', 'IN_PROGRESS'].includes(r.status),
  );

  const prevPendingCountRef = useRef<number>(pendingRequests.length);

  // 1. Auto-refresh rides every 4 seconds so incoming passenger requests arrive in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshRides();
    }, 4000);
    return () => clearInterval(interval);
  }, [onRefreshRides]);

  // 2. Alert driver with sound, vibration and push notification when new ride is requested
  useEffect(() => {
    if (pendingRequests.length > prevPendingCountRef.current) {
      if (soundEnabled) {
        playRideChime();
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([250, 100, 250, 100, 350]);
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🚗 Nova Corrida no VaiCar!', {
            body: `Nova solicitação recebida de ${pendingRequests[0]?.passengerName || 'Passageiro'}! Toque para aceitar.`,
          });
        } catch {
          // ignore
        }
      }
    }
    prevPendingCountRef.current = pendingRequests.length;
  }, [pendingRequests.length, soundEnabled]);

  // Real-time instant sync: update cockpit the exact millisecond a ride is created or modified
  useEffect(() => {
    const unsubscribe = realtimeSync.subscribe((event) => {
      if (event.type === 'RIDE_CREATED' || event.type === 'RIDE_UPDATED' || event.type === 'RIDE_DELETED') {
        onRefreshRides();
      }
    });
    return () => unsubscribe();
  }, [onRefreshRides]);

  const completedTodayCount = driverRides.filter((r) => r.status === 'COMPLETED').length;
  const estimatedRevenue = driverRides
    .filter((r) => r.status === 'COMPLETED')
    .reduce((acc, curr) => acc + curr.estimatedPrice, 0);

  const handleToggleOnline = async () => {
    if (!driver.isOnline && driver.regulatoryStatus !== 'APPROVED') {
      alert(
        'Você não pode ficar Online até que sua documentação seja aprovada pelo administrador municipal.',
      );
      return;
    }

    try {
      setIsUpdating(true);
      const updated = await updateDriverAvailability(driver.id, !driver.isOnline);
      onRefreshDriver(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fareSettings.isEnforced) {
      if (Number(minFare) < fareSettings.minBaseFare) {
        alert(
          `O valor da bandeirada / corrida mínima (R$ ${Number(minFare).toFixed(2)}) não pode ser inferior ao piso da plataforma de R$ ${fareSettings.minBaseFare.toFixed(2)}.`,
        );
        return;
      }
      if (Number(rateKm) < fareSettings.minRatePerKm) {
        alert(
          `O valor por km rodado (R$ ${Number(rateKm).toFixed(2)}/km) não pode ser inferior ao piso da plataforma de R$ ${fareSettings.minRatePerKm.toFixed(2)}/km.`,
        );
        return;
      }
      for (const r of fixedRoutes) {
        if (Number(r.price) < fareSettings.minFixedRoutePrice) {
          alert(
            `A rota fixa cadastrada não pode ter valor inferior ao piso de R$ ${fareSettings.minFixedRoutePrice.toFixed(2)}.`,
          );
          return;
        }
      }
    }

    try {
      setIsUpdating(true);
      await updateDriverPricing(driver.id, {
        pricingType,
        minimumFare: Number(minFare),
        ratePerKm: Number(rateKm),
        fixedRoutes,
      });
      alert('Tabela de preços atualizada com sucesso!');
      driver.pricing.minimumFare = Number(minFare);
      driver.pricing.ratePerKm = Number(rateKm);
      driver.pricing.pricingType = pricingType;
      driver.pricing.fixedRoutes = fixedRoutes;
      onRefreshDriver({ ...driver });
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar preços');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddFixedRoute = () => {
    if (!newOrigZone || !newDestZone || newOrigZone === newDestZone) {
      alert('Escolha duas zonas diferentes para cadastrar a rota fixa.');
      return;
    }
    if (fareSettings.isEnforced && Number(newRoutePrice) < fareSettings.minFixedRoutePrice) {
      alert(`O valor da rota fixa não pode ser inferior ao piso mínimo de R$ ${fareSettings.minFixedRoutePrice.toFixed(2)}.`);
      return;
    }
    const updated = [
      ...fixedRoutes,
      { originZoneId: newOrigZone, destinationZoneId: newDestZone, price: Number(newRoutePrice) },
    ];
    setFixedRoutes(updated);
  };

  const handleRemoveFixedRoute = (index: number) => {
    const updated = fixedRoutes.filter((_, i) => i !== index);
    setFixedRoutes(updated);
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim()) {
      alert('Por favor, informe sua chave Pix para receber diretamente dos passageiros.');
      return;
    }
    try {
      setIsUpdating(true);
      await updateDriverPaymentSettings(driver.id, {
        pixKey: pixKey.trim(),
        pixKeyType,
        acceptsCardMachine,
        acceptedPaymentMethods: [
          'PIX',
          'CASH',
          ...(acceptsCardMachine ? ['CARD_CREDIT', 'CARD_DEBIT'] : []),
        ],
      });
      driver.pixKey = pixKey.trim();
      driver.pixKeyType = pixKeyType;
      driver.acceptsCardMachine = acceptsCardMachine;
      onRefreshDriver({ ...driver });
      setPaymentSaveSuccess(true);
      setTimeout(() => setPaymentSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações de recebimento');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmRidePayment = async (rideId: string) => {
    try {
      setIsUpdating(true);
      const updated = await updateRidePaymentStatus(rideId, 'CONFIRMED_BY_DRIVER');
      if (updated && (updated as any).id) {
        broadcastLocalRideUpdate(updated as any);
      }
      await onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar recebimento da corrida');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleZone = async (zoneId: string) => {
    const exists = driver.operatingZones.includes(zoneId);
    let updatedZones = exists
      ? driver.operatingZones.filter((z) => z !== zoneId)
      : [...driver.operatingZones, zoneId];

    if (updatedZones.length === 0) {
      alert('Você precisa manter pelo menos 1 zona ativa de atendimento.');
      return;
    }

    try {
      setIsUpdating(true);
      const updated = await updateDriverAvailability(driver.id, driver.isOnline, updatedZones);
      onRefreshDriver(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar zonas');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCustomZone = async (zoneNameToAdd?: string) => {
    const targetName = (zoneNameToAdd || newZoneInput).trim();
    if (!targetName) return;

    try {
      setIsAddingZone(true);
      setZoneActionMessage(null);
      const created = await createZone({ name: targetName });

      // Update local zones list if not present
      setCustomZonesList((prev) => {
        const exists = prev.some((z) => z.id === created.id || z.name.toLowerCase() === created.name.toLowerCase());
        return exists ? prev : [...prev, created];
      });

      // Automatically add to driver's operating zones if not already selected
      if (!driver.operatingZones.includes(created.id)) {
        const updatedZones = [...driver.operatingZones, created.id];
        const updated = await updateDriverAvailability(driver.id, driver.isOnline, updatedZones);
        onRefreshDriver(updated);
      }

      setNewZoneInput('');
      setZoneActionMessage({
        type: 'success',
        text: `Bairro/Zona "${created.name}" cadastrada com sucesso e ativada para você!`,
      });
      setTimeout(() => setZoneActionMessage(null), 6000);
    } catch (err: any) {
      setZoneActionMessage({
        type: 'error',
        text: err.message || 'Erro ao adicionar nova zona.',
      });
    } finally {
      setIsAddingZone(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(rideId, 'ACCEPTED');
      broadcastLocalRideUpdate(updated);
      await onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao aceitar corrida');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeclineRide = async (rideId: string) => {
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(rideId, 'CANCELLED_BY_DRIVER', 'Recusado pelo motorista');
      broadcastLocalRideUpdate(updated);
      await onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdvanceActiveRide = async (nextStatus: any) => {
    if (!activeRide) return;
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(activeRide.id, nextStatus);
      broadcastLocalRideUpdate(updated);
      await onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelActiveRideByDriver = async () => {
    if (!activeRide) return;
    const reason = window.prompt(
      'Informe o motivo do cancelamento (ex: Passageiro não compareceu, Problema no veículo):',
      'Passageiro não compareceu ao embarque',
    );
    if (!reason) return;
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(activeRide.id, 'CANCELLED_BY_DRIVER', reason);
      broadcastLocalRideUpdate(updated);
      await onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar corrida');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSimulateDocUpload = async (reqId: string) => {
    try {
      setIsUpdating(true);
      await submitDriverDocument(driver.id, {
        requirementId: reqId,
        documentNumber: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
        expiryDate: '2027-12-31',
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      });
      alert('Documento enviado para análise administrativa!');
      // Update local state
      const doc = driver.documents.find((d) => d.requirementId === reqId);
      if (doc) doc.status = 'IN_REVIEW';
      onRefreshDriver({ ...driver });
    } catch (err: any) {
      alert(err.message || 'Erro no envio');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Cockpit Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={driver.avatarUrl}
              alt={driver.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                driver.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{driver.name}</h1>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  driver.regulatoryStatus === 'APPROVED'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : driver.regulatoryStatus === 'IN_REVIEW'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                    : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                }`}
              >
                {driver.regulatoryStatus === 'APPROVED'
                  ? '🟢 Aprovado'
                  : driver.regulatoryStatus === 'IN_REVIEW'
                  ? '🟡 Documentação em análise'
                  : '🔴 Pendência de documentos'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {driver.vehicle.brand} {driver.vehicle.model} • Placa {driver.vehicle.licensePlate} • Categoria {driver.professionalCategory}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {driver.ratingAverage} ({driver.ratingCount} avaliações)
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">
                Plano: 10% ou R$ {driver.monthlyFeeBrl ?? monthlyPlanPrice}/mês
              </span>
            </div>
          </div>
        </div>

        {/* Online / Offline Main Switcher Button */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-slate-800">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Disponibilidade
            </span>
            <span
              className={`text-sm font-extrabold ${
                driver.isOnline ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {driver.isOnline ? '🟢 ONLINE (Disponível)' : '⚫ OFFLINE (Indisponível)'}
            </span>
          </div>

          <button
            id="driver-toggle-online-btn"
            onClick={handleToggleOnline}
            disabled={isUpdating}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
              driver.isOnline
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{driver.isOnline ? 'FICAR OFFLINE' : 'FICAR ONLINE'}</span>
          </button>

          {/* Sound & Notification Controls */}
          <div className="flex items-center gap-1.5 pt-1.5 flex-wrap justify-end">
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playRideChime();
              }}
              className={`text-[11px] px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Som ativado (toque para silenciar)' : 'Som desativado (toque para ativar)'}
            >
              {soundEnabled ? <Volume2 className="w-3 h-3 text-emerald-400" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
              <span>{soundEnabled ? 'Sons Ativos' : 'Silencioso'}</span>
            </button>

            <button
              onClick={playRideChime}
              className="text-[10px] px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              title="Testar som do sino de chamada"
            >
              Testar
            </button>

            {!hasNotifPermission && (
              <button
                onClick={requestNotificationPermission}
                className="text-[11px] px-2 py-1 rounded-lg bg-teal-950/70 border border-teal-500/40 text-teal-300 hover:bg-teal-900/70 font-semibold flex items-center gap-1 cursor-pointer"
                title="Ativar notificações push no navegador/celular"
              >
                <Bell className="w-3 h-3 text-teal-400" />
                <span>Alertas Celular</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Metrics Dashboard Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Solicitações Hoje
          </span>
          <div className="text-2xl font-black text-white">{driverRides.length}</div>
          <span className="text-[10px] text-slate-500">Recebidas na plataforma</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Corridas Concluídas
          </span>
          <div className="text-2xl font-black text-emerald-400">{completedTodayCount}</div>
          <span className="text-[10px] text-slate-500">{driver.ridesCompleted} acumuladas no total</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Avaliação Geral
          </span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" />
            <span>{driver.ratingAverage}</span>
          </div>
          <span className="text-[10px] text-slate-500">{driver.ratingCount} passageiros avaliaram</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Receita Informada
          </span>
          <div className="text-2xl font-black text-white">R$ {estimatedRevenue}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">Total bruto das viagens</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('PANEL')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'PANEL'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Corridas & Solicitações ({pendingRequests.length + (activeRide ? 1 : 0)})
        </button>

        <button
          onClick={() => setActiveTab('PRICING')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'PRICING'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Configurar Meus Preços
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'PAYMENTS'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Recebimento & Pix</span>
        </button>

        <button
          onClick={() => setActiveTab('ZONES')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ZONES'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Minhas Zonas ({driver.operatingZones.length})
        </button>

        <button
          onClick={() => setActiveTab('DOCS')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'DOCS'
              ? 'bg-emerald-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Documentos & Requisitos
        </button>

        <button
          onClick={onGoToSubscription}
          className="ml-auto px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:brightness-110 flex items-center gap-1.5"
        >
          <Award className="w-3.5 h-3.5" />
          <span>Meu Plano Pro (R$ {driver.monthlyFeeBrl ?? monthlyPlanPrice}/mês)</span>
        </button>
      </div>

      {/* TAB 1: RIDES & REQUESTS */}
      {activeTab === 'PANEL' && (
        <div className="space-y-6">
          {/* Pending Requests Alert Cards */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span>Nova Solicitação de Corrida</span>
              </h3>

              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-gradient-to-br from-slate-900 to-amber-950/20 border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={req.passengerAvatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"}
                        alt={req.passengerName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      {(() => {
                        const delivery = parseDeliveryDetails(req.originLandmark);
                        if (delivery) {
                          return (
                            <div>
                              <span className="text-[10px] font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded uppercase">
                                📦 Solicitação de Entrega
                              </span>
                              <h4 className="text-lg font-black text-white mt-0.5">
                                Cliente: {req.passengerName}
                              </h4>
                              <p className="text-xs text-slate-300">
                                Tipo de Envio: {delivery.vehicleType} • Distância ~{req.estimatedDistanceKm} km
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded uppercase">
                              Chamada Imediata
                            </span>
                            <h4 className="text-lg font-black text-white mt-0.5">
                              Passageiro(a): {req.passengerName}
                            </h4>
                            <p className="text-xs text-slate-300">
                              {req.passengerCount} {req.passengerCount === 1 ? 'passageiro' : 'passageiros'} • Distância ~{req.estimatedDistanceKm} km
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Valor da corrida
                      </span>
                      <span className="text-3xl font-black text-emerald-400">
                        R$ {req.estimatedPrice}
                      </span>
                      <span className="text-[10px] text-emerald-300 block font-semibold">
                        Pagamento direto pelo passageiro
                      </span>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-400">Origem:</span>
                        <span className="text-white font-bold">{req.originAddress}</span>
                      </div>
                      {req.originLandmark && (() => {
                        const delivery = parseDeliveryDetails(req.originLandmark);
                        if (delivery) {
                          return (
                            <div className="mt-3 bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-3">
                              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Package className="w-4 h-4 text-emerald-400" />
                                <span className="font-extrabold text-white text-xs uppercase tracking-wider">📦 Detalhes do Item de Entrega</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                                <div>
                                  <span className="text-slate-500 block">Categoria:</span>
                                  <span className="text-white font-bold">{delivery.category}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Peso Estimado:</span>
                                  <span className="text-white font-bold">{delivery.weight} kg</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Tamanho:</span>
                                  <span className="text-white font-bold">{delivery.size}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Valor Declarado:</span>
                                  <span className="text-emerald-400 font-mono font-bold">R$ {delivery.declaredValue}</span>
                                </div>
                              </div>
                              <div className="bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-400 border border-slate-800/60">
                                <strong className="text-slate-300">Descrição do Objeto:</strong> {delivery.description}
                              </div>
                              
                              {/* Safety Disclaimers and Refusal Rule explicitly shown before accepting (Section 7) */}
                              <div className="bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-lg text-[10px] text-rose-300/90 leading-relaxed space-y-1">
                                <div className="font-bold flex items-center gap-1 text-rose-400">
                                  <span>⚠️ Regra de Segurança & Recusa</span>
                                </div>
                                <p>
                                  Como entregador parceiro, você tem o direito de recusar este envio caso o objeto não corresponda à descrição informada, exceda os limites do seu veículo ou seja proibido/perigoso.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="pl-6 text-amber-300 font-semibold flex items-center gap-1.5 bg-amber-950/20 py-1 px-2 rounded-md border border-amber-500/10">
                            <span>📍 Ref: {req.originLandmark}</span>
                          </div>
                        );
                      })()}
                      {req.originMapsLink && (
                        <div className="pl-6">
                          <a
                            href={req.originMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold hover:underline"
                          >
                            🗺 Abrir no Google Maps ↗
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-800/60 pt-2">
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-slate-400">Destino:</span>
                      <span className="text-white font-bold">{req.destinationAddress}</span>
                    </div>
                  </div>

                  {/* Payment Method Badge */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      Forma de Pagamento:
                    </span>
                    {req.paymentMethod === 'PIX' && (
                      <span className="font-bold text-teal-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Pix Direto na sua Conta
                      </span>
                    )}
                    {req.paymentMethod === 'CASH' && (
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" />
                        Dinheiro {req.paymentChangeFor ? `(Troco p/ R$ ${req.paymentChangeFor})` : '(Valor Exato)'}
                      </span>
                    )}
                    {(req.paymentMethod === 'CARD_CREDIT' || req.paymentMethod === 'CARD_DEBIT') && (
                      <span className="font-bold text-indigo-400 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        Cartão {req.savedCard?.brand?.toUpperCase() || 'Cadastrado'} ({req.savedCard?.type === 'DEBIT' ? 'Débito' : 'Crédito'})
                      </span>
                    )}
                    {!req.paymentMethod && (
                      <span className="font-bold text-teal-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Pix no Desembarque
                      </span>
                    )}
                  </div>

                  {/* Accept / Decline Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      id={`accept-ride-btn-${req.id}`}
                      onClick={() => handleAcceptRide(req.id)}
                      disabled={isUpdating}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>ACEITAR CORRIDA</span>
                    </button>

                    <button
                      onClick={() => handleDeclineRide(req.id)}
                      disabled={isUpdating}
                      className="px-6 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs py-3.5 rounded-xl transition-all cursor-pointer"
                    >
                      RECUSAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active In-Progress Ride */}
          {activeRide && (
            <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
              {/* Active Ride Status Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Corrida Ativa em Execução
                  </span>
                </div>
                <span className="text-xs text-slate-400">#{activeRide.id.slice(-6)}</span>
              </div>

              {/* Driver Safety Verification Box */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2 text-slate-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-emerald-300 text-sm">Conferência de Segurança do Motorista</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Antes de iniciar a viagem, confirme que o passageiro corresponde à solicitação apresentada no aplicativo.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      O motorista pode interromper ou recusar uma viagem quando existir uma situação concreta de risco à sua integridade física ou violação das regras da plataforma.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={() => setIsSafetyModalOpen(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Consultar Regras de Segurança e Obrigações do Motorista</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={activeRide.passengerAvatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"}
                    alt={activeRide.passengerName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xl font-black text-white">{activeRide.passengerName}</h3>
                    <div className="text-xs text-slate-300 space-y-1 mt-0.5">
                      <p>
                        Origem: <strong>{activeRide.originAddress}</strong> ➔ Destino: <strong>{activeRide.destinationAddress}</strong>
                      </p>
                      {activeRide.originLandmark && (() => {
                        const delivery = parseDeliveryDetails(activeRide.originLandmark);
                        if (delivery) {
                          return (
                            <div className="mt-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2.5 max-w-md">
                              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                                <Package className="w-4 h-4 text-emerald-400" />
                                <span className="font-extrabold text-white text-xs uppercase tracking-wider">📦 Informações de Envio (Ativo)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                                <div>
                                  <span className="text-slate-500 block">Categoria:</span>
                                  <span className="text-white font-bold">{delivery.category}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Peso Estimado:</span>
                                  <span className="text-white font-bold">{delivery.weight} kg</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Tamanho:</span>
                                  <span className="text-white font-bold">{delivery.size}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Valor Declarado:</span>
                                  <span className="text-emerald-400 font-mono font-bold">R$ {delivery.declaredValue}</span>
                                </div>
                              </div>
                              <div className="bg-slate-900/50 p-2 rounded text-[11px] text-slate-400">
                                <strong className="text-slate-300">Descrição:</strong> {delivery.description}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <p className="text-amber-300 font-bold flex items-center gap-1.5 bg-amber-950/30 py-0.5 px-2 rounded-md border border-amber-500/10 w-fit">
                            <span>📍 Ref: {activeRide.originLandmark}</span>
                          </p>
                        );
                      })()}

                      {/* GPS Navigation shortcuts for Driver */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ARRIVING'
                            ? (activeRide.originMapsLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.originAddress)}&travelmode=driving`)
                            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.destinationAddress)}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-800 hover:border-sky-500/30 transition-all flex items-center gap-1.5"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Navegar Google Maps ({activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ARRIVING' ? 'Embarque' : 'Destino'}) ↗</span>
                        </a>
                        <a
                          href={`https://waze.com/ul?q=${encodeURIComponent(activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ARRIVING' ? activeRide.originAddress : activeRide.destinationAddress)}&navigate=yes`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-bold text-xs py-1.5 px-3 rounded-lg border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Waze ({activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ARRIVING' ? 'Embarque' : 'Destino'}) ↗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-2xl font-black text-emerald-400">R$ {activeRide.estimatedPrice}</span>
                  <span className="text-[10px] text-slate-400 block">Receber diretamente do passageiro</span>
                </div>
              </div>

              {/* Payment details & status */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">Pagamento:</span>
                    {activeRide.paymentMethod === 'PIX' && (
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Pix Direto
                      </span>
                    )}
                    {activeRide.paymentMethod === 'CASH' && (
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" /> Dinheiro em Espécie {activeRide.paymentChangeFor ? `(Troco p/ R$ ${activeRide.paymentChangeFor})` : ''}
                      </span>
                    )}
                    {(activeRide.paymentMethod === 'CARD_CREDIT' || activeRide.paymentMethod === 'CARD_DEBIT') && (
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Cartão {activeRide.savedCard?.brand?.toUpperCase() || ''} ({activeRide.savedCard?.type === 'DEBIT' ? 'Débito' : 'Crédito'})
                      </span>
                    )}
                    {!activeRide.paymentMethod && (
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Pix
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      activeRide.paymentStatus === 'CONFIRMED_BY_DRIVER' || activeRide.paymentStatus === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                    }`}>
                      {activeRide.paymentStatus === 'CONFIRMED_BY_DRIVER' || activeRide.paymentStatus === 'PAID'
                        ? '✔ Pagamento Confirmado'
                        : '⏳ Pagamento Pendente'}
                    </span>
                    {activeRide.paymentStatus !== 'CONFIRMED_BY_DRIVER' && activeRide.paymentStatus !== 'PAID' && (
                      <button
                        onClick={() => handleConfirmRidePayment(activeRide.id)}
                        disabled={isUpdating}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                      >
                        Confirmar Recebimento R$ {activeRide.estimatedPrice}
                      </button>
                    )}
                  </div>
                </div>

                {activeRide.paymentMethod === 'PIX' && (
                  <p className="text-[11px] text-slate-400">
                    O passageiro visualizou sua chave Pix <strong>({driver.pixKey || driver.phone})</strong> no aplicativo e fará a transferência direta para você.
                  </p>
                )}
                {activeRide.paymentMethod === 'CASH' && (
                  <p className="text-[11px] text-slate-400">
                    Cobrar R$ <strong>{activeRide.estimatedPrice}</strong> em dinheiro no momento do desembarque.{' '}
                    {activeRide.paymentChangeFor && `Passageiro pediu troco para R$ ${activeRide.paymentChangeFor}.`}
                  </p>
                )}
                {(activeRide.paymentMethod === 'CARD_CREDIT' || activeRide.paymentMethod === 'CARD_DEBIT') && (
                  <p className="text-[11px] text-slate-400">
                    Cartão cadastrado pelo passageiro (final {activeRide.savedCard?.last4 || '••••'}).{' '}
                    {driver.acceptsCardMachine ? 'Ou use sua maquininha física caso o passageiro prefira pagar no ato.' : ''}
                  </p>
                )}
              </div>

              {/* Status progression actions for driver */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status atual:</span>
                  <span className="font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                    {activeRide.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeRide.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleAdvanceActiveRide('DRIVER_ARRIVING')}
                      disabled={isUpdating}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3 rounded-xl cursor-pointer"
                    >
                      Avisar: Estou Chegando ao Ponto
                    </button>
                  )}
                  {activeRide.status === 'DRIVER_ARRIVING' && (
                    <button
                      onClick={() => handleAdvanceActiveRide('PASSENGER_PICKED_UP')}
                      disabled={isUpdating}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs py-3 rounded-xl cursor-pointer"
                    >
                      Confirmar Embarque do Passageiro
                    </button>
                  )}
                  {activeRide.status === 'PASSENGER_PICKED_UP' && (
                    <button
                      onClick={() => handleAdvanceActiveRide('IN_PROGRESS')}
                      disabled={isUpdating}
                      className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-3 rounded-xl cursor-pointer"
                    >
                      Iniciar Viagem até Destino
                    </button>
                  )}
                  {activeRide.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleAdvanceActiveRide('COMPLETED')}
                      disabled={isUpdating}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl cursor-pointer shadow-lg"
                    >
                      FINALIZAR CORRIDA E CONFIRMAR RECEBIMENTO ✔
                    </button>
                  )}

                  <button
                    onClick={handleCancelActiveRideByDriver}
                    disabled={isUpdating}
                    className="px-4 py-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    title="Cancelar corrida caso o passageiro desista ou não compareça"
                  >
                    Cancelar Viagem
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ride History for Driver */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Histórico Recente de Corridas
            </h3>
            {driverRides.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
                Nenhuma corrida registrada hoje. Fique online para começar a receber solicitações em São Sebastião!
              </div>
            ) : (
              <div className="space-y-2.5">
                {driverRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white text-sm">{ride.passengerName}</span>
                      <p className="text-slate-400 mt-0.5">
                        {ride.originAddress} ➔ {ride.destinationAddress}
                      </p>
                      <span className="text-[10px] text-slate-500">{ride.createdAt.split('T')[0]}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-400">
                        R$ {ride.estimatedPrice}
                      </span>
                      <span
                        className={`block text-[10px] font-bold ${
                          ride.status === 'COMPLETED'
                            ? 'text-emerald-400'
                            : ride.status.startsWith('CANCELLED')
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {ride.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRICING CONFIGURATION */}
      {activeTab === 'PRICING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-white">Configuração de Preços</h2>
              <p className="text-xs text-slate-400">
                Defina como suas corridas serão cobradas em São Sebastião. Você pode usar tarifas fixas para trajetos conhecidos ou preço por km.
              </p>
            </div>
            {fareSettings.isEnforced && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-3 py-1 rounded-full w-fit">
                <Scale className="w-3.5 h-3.5" />
                <span>Piso Regulatório Ativo</span>
              </span>
            )}
          </div>

          {/* Fair Floor Regulatory Protection Banner */}
          <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Piso de Preço da Plataforma (Base Justa da Categoria)
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Para proteger a renda dos motoristas parceiros e impedir concorrência predatória (leilão de preços para baixo), a plataforma exige os seguintes pisos mínimos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Bandeirada Mínima</span>
                <span className="text-sm font-black text-emerald-400">R$ {fareSettings.minBaseFare.toFixed(2)}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Km Mínimo</span>
                <span className="text-sm font-black text-emerald-400">R$ {fareSettings.minRatePerKm.toFixed(2)}/km</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Rotas Fixas Mínimas</span>
                <span className="text-sm font-black text-emerald-400">R$ {fareSettings.minFixedRoutePrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePricing} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Modalidade de Preço</label>
                <select
                  value={pricingType}
                  onChange={(e: any) => setPricingType(e.target.value)}
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs"
                >
                  <option value="FIXED_ROUTE">Preço Fixo por Rota (Bairros)</option>
                  <option value="KM_ONLY">Preço por Km Rodado</option>
                  <option value="MINIMUM_PLUS_KM">Bandeirada Mínima + Km</option>
                  <option value="COMPOSITE">Composto (Mínimo + Km + Tempo)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Modelo de cálculo aplicado ao passageiro.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Preço Mínimo / Bandeirada (R$)</label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Piso: R$ {fareSettings.minBaseFare.toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min={fareSettings.isEnforced ? fareSettings.minBaseFare : 0}
                  value={minFare}
                  onChange={(e) => setMinFare(Number(e.target.value))}
                  className={`w-full bg-slate-950 text-white p-3 rounded-xl border text-xs font-bold outline-none transition-colors ${
                    fareSettings.isEnforced && Number(minFare) < fareSettings.minBaseFare
                      ? 'border-rose-500 text-rose-300'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {fareSettings.isEnforced && Number(minFare) < fareSettings.minBaseFare ? (
                  <p className="text-[10px] text-rose-400 font-semibold">
                    ⚠ Abaixo do piso mínimo permitido (R$ {fareSettings.minBaseFare.toFixed(2)})
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Valor mínimo cobrado na partida de qualquer corrida.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Preço por Km (R$/km)</label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Piso: R$ {fareSettings.minRatePerKm.toFixed(2)}/km
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min={fareSettings.isEnforced ? fareSettings.minRatePerKm : 0}
                  value={rateKm}
                  onChange={(e) => setRateKm(Number(e.target.value))}
                  className={`w-full bg-slate-950 text-white p-3 rounded-xl border text-xs font-bold outline-none transition-colors ${
                    fareSettings.isEnforced && Number(rateKm) < fareSettings.minRatePerKm
                      ? 'border-rose-500 text-rose-300'
                      : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {fareSettings.isEnforced && Number(rateKm) < fareSettings.minRatePerKm ? (
                  <p className="text-[10px] text-rose-400 font-semibold">
                    ⚠ Abaixo do piso mínimo permitido (R$ {fareSettings.minRatePerKm.toFixed(2)}/km)
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Tarifa aplicada por quilômetro rodado.
                  </p>
                )}
              </div>
            </div>

            {/* Fixed Routes Table */}
            <div className="space-y-3 border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Rotas Fixas Cadastradas</h3>
                  <p className="text-[11px] text-slate-400">
                    Defina valores pré-combinados para viagens entre praias (Piso mínimo: R$ {fareSettings.minFixedRoutePrice.toFixed(2)})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {fixedRoutes.map((route, idx) => {
                  const origName = allZones.find((z) => z.id === route.originZoneId)?.name || route.originZoneId;
                  const destName = allZones.find((z) => z.id === route.destinationZoneId)?.name || route.destinationZoneId;
                  const isRouteBelowFloor = fareSettings.isEnforced && Number(route.price) < fareSettings.minFixedRoutePrice;
                  return (
                    <div
                      key={idx}
                      className={`bg-slate-950 p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isRouteBelowFloor ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-white font-bold">{origName}</span>
                        <span className="text-slate-500">➔</span>
                        <span className="text-white font-bold">{destName}</span>
                        {isRouteBelowFloor && (
                          <span className="text-[10px] text-rose-400 font-bold ml-2">
                            (Abaixo do piso de R$ {fareSettings.minFixedRoutePrice.toFixed(2)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-emerald-400">R$ {route.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFixedRoute(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Fixed Route */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-dashed border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 block">+ Adicionar Rota Fixa</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Piso Mínimo: R$ {fareSettings.minFixedRoutePrice.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={newOrigZone}
                    onChange={(e) => setNewOrigZone(e.target.value)}
                    className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 text-xs"
                  >
                    {allZones.map((z) => (
                      <option key={`f-orig-${z.id}`} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newDestZone}
                    onChange={(e) => setNewDestZone(e.target.value)}
                    className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 text-xs"
                  >
                    {allZones.map((z) => (
                      <option key={`f-dest-${z.id}`} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-slate-900 px-3 rounded-xl border border-slate-700">
                    <span className="text-xs text-slate-400">R$</span>
                    <input
                      type="number"
                      min={fareSettings.isEnforced ? fareSettings.minFixedRoutePrice : 0}
                      value={newRoutePrice}
                      onChange={(e) => setNewRoutePrice(Number(e.target.value))}
                      className="w-full bg-transparent text-white text-xs font-bold outline-none py-2"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFixedRoute}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cadastrar Rota
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              SALVAR MINHA TABELA DE PREÇOS
            </button>
          </form>
        </div>
      )}

      {/* TAB: PAYMENTS & PIX CONFIGURATION */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-black text-white">Recebimento & Chave Pix</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure como os passageiros pagarão as corridas diretamente a você.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl w-fit">
              Pagamento direto do passageiro
            </span>
          </div>

          {/* Model explanation banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-1.5">
            <h4 className="font-black text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Recebimento Direto e Sem Retenções
            </h4>
            <p className="text-slate-300">
              Na VaiCar, os passageiros realizam o pagamento da corrida diretamente a você via <strong>Pix direto para sua chave bancária</strong>, <strong>dinheiro físico</strong> ou <strong>cartão de crédito/débito</strong>.
            </p>
          </div>

          <form onSubmit={handleSavePaymentSettings} className="space-y-6">
            {/* PIX SECTION */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white">Chave Pix para Recebimento</h3>
                    <p className="text-[11px] text-slate-400">
                      O passageiro recebe sua chave Pix e QR Code diretamente no app
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-400 bg-teal-950 px-2.5 py-1 rounded-md border border-teal-500/30">
                  Instantâneo
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">
                    Tipo de Chave Pix
                  </label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as any)}
                    className="w-full bg-slate-900 text-white p-3 rounded-xl border border-slate-700 text-xs font-semibold outline-none focus:border-emerald-500"
                  >
                    <option value="PHONE">Telefone / Celular</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="RANDOM">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">
                    Chave Pix Cadastrada
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder={
                        pixKeyType === 'PHONE'
                          ? '(12) 99999-9999'
                          : pixKeyType === 'CPF'
                          ? '000.000.000-00'
                          : pixKeyType === 'EMAIL'
                          ? 'seu.email@exemplo.com'
                          : 'Chave EVP aleatória do seu banco'
                      }
                      className="w-full bg-slate-900 text-white p-3 pr-24 rounded-xl border border-slate-700 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!pixKey) return;
                        navigator.clipboard.writeText(pixKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="absolute right-2 top-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD & CASH OPTIONS */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white">Outras Formas de Pagamento Aceitas</h3>

              {/* Card Machine in Car */}
              <div className="flex items-start justify-between gap-4 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Maquininha de Cartão Física no Veículo
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Aceita cartão de crédito e débito na sua maquininha física caso o passageiro solicite.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={acceptsCardMachine}
                    onChange={(e) => setAcceptsCardMachine(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Cash notice */}
              <div className="flex items-start gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Dinheiro em Espécie</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    O passageiro pode pagar em dinheiro no final da corrida. Se precisar de troco, o valor informado aparecerá na notificação da corrida para você se preparar.
                  </p>
                </div>
              </div>
            </div>

            {/* Save notification */}
            {paymentSaveSuccess && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Configurações de recebimento salvas com sucesso!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isUpdating ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES DE RECEBIMENTO'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: OPERATING ZONES */}
      {activeTab === 'ZONES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white">Minhas Zonas de Atendimento</h2>
              <p className="text-xs text-slate-400">
                Selecione as praias e bairros de São Sebastião onde você atende. Você só receberá solicitações originadas nas zonas ativas.
              </p>
            </div>
            <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-bold self-start sm:self-auto">
              {driver.operatingZones.length} zonas ativas
            </div>
          </div>

          {/* Add Custom Zone Card */}
          <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">
                  Adicionar Bairro ou Praia Personalizada
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                O motorista pode colocar as zonas dele por mais que não apareça no menu padrão. Adicione bairros como <strong>Enseada</strong>, <strong>Canto do Mar</strong>, <strong>Morro do Abrigo</strong>, etc.
              </p>
            </div>

            {/* Quick-add chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sugestões rápidas de São Sebastião:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Enseada',
                  'Canto do Mar',
                  'Morro do Abrigo',
                  'Topolândia',
                  'Jaraguá',
                  'Cigarras',
                  'Boracéia',
                  'Pontal da Cruz',
                ].map((sug) => {
                  const alreadyActive = customZonesList.some(
                    (z) => z.name.toLowerCase() === sug.toLowerCase() && driver.operatingZones.includes(z.id)
                  );
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={isAddingZone || alreadyActive}
                      onClick={() => handleAddCustomZone(sug)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        alreadyActive
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 opacity-60 cursor-default'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{sug}</span>
                      {alreadyActive && <span className="text-[10px] ml-0.5 font-bold">✓ Ativo</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form to type any custom neighborhood */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddCustomZone();
              }}
              className="flex flex-col sm:flex-row gap-2 pt-1"
            >
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newZoneInput}
                  onChange={(e) => setNewZoneInput(e.target.value)}
                  placeholder="Nome do bairro ou praia (ex: Enseada, Morro do Abrigo, Canto do Mar...)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingZone || !newZoneInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingZone ? 'Adicionando...' : 'Adicionar e Ativar'}</span>
              </button>
            </form>

            {zoneActionMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  zoneActionMessage.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/80 border border-red-500/50 text-red-300'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{zoneActionMessage.text}</span>
              </div>
            )}
          </div>

          {/* Zones list grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Zonas Cadastradas na Plataforma ({customZonesList.length}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {customZonesList.map((zone) => {
                const isSelected = driver.operatingZones.includes(zone.id);
                return (
                  <div
                    key={zone.id}
                    onClick={() => handleToggleZone(zone.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`}
                      />
                      <span className="truncate">{zone.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="accent-emerald-500 pointer-events-none shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS & REGULATORY REQUIREMENTS */}
      {activeTab === 'DOCS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Documentos e Exigências Cadastrais</h2>
              <p className="text-xs text-slate-400">
                Verificação cadastral e documentação exigida pela plataforma
              </p>
            </div>
            <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-medium">
              Identificação: <strong>{driver.licenseNumber || 'Em análise'}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {requirements.map((req) => {
              const doc = driver.documents.find((d) => d.requirementId === req.id);
              const status = doc ? doc.status : 'PENDING';

              return (
                <div
                  key={req.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{req.name}</span>
                      {req.isMandatory && (
                        <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-bold">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl">{req.description}</p>
                    {doc?.rejectionReason && (
                      <p className="text-xs text-rose-400 font-medium">
                        Motivo da rejeição: {doc.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        status === 'APPROVED'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                          : status === 'IN_REVIEW'
                          ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {status === 'APPROVED'
                        ? '✔ Aprovado'
                        : status === 'IN_REVIEW'
                        ? '⏳ Em análise'
                        : 'Pendente'}
                    </span>

                    {status !== 'APPROVED' && (
                      <button
                        onClick={() => handleSimulateDocUpload(req.id)}
                        disabled={isUpdating}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                      >
                        Enviar Documento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Driver Safety and Terms Modal */}
      {isSafetyModalOpen && (
        <LegalModal
          isOpen={isSafetyModalOpen}
          onClose={() => setIsSafetyModalOpen(false)}
          initialTab="seguranca"
        />
      )}
    </div>
  );
};
