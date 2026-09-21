import React, { useState, useEffect } from 'react';
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
  Phone,
  AlertTriangle,
  History,
  Star,
  User,
  HelpCircle,
  MessageSquare,
  Copy,
  Check,
  Banknote,
  CreditCard,
  QrCode,
  Lock,
  PhoneCall,
  Send,
} from 'lucide-react';
import { Zone, Ride, Driver, PaymentMethod, SearchDriversResponse } from '../types.ts';
import {
  searchDrivers,
  createRide,
  updateRideStatus,
  updateRidePaymentStatus,
  submitReview,
  passengerAuth,
  fetchPassengerRides,
  fetchPassengerReviews,
  getWhatsAppContact,
} from '../lib/api.ts';
import { LiveRideTracker } from './LiveRideTracker.tsx';

interface PassengerDashboardProps {
  zones: Zone[];
  allRides: Ride[];
  onRefreshRides: () => void;
  onGoToDriverSignup: () => void;
  initialTrackedRide?: Ride | null;
  onOpenLegal: (tab: 'termos' | 'privacidade' | 'regulacao') => void;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  zones,
  allRides,
  onRefreshRides,
  onGoToDriverSignup,
  initialTrackedRide,
  onOpenLegal,
}) => {
  const [activeTab, setActiveTab] = useState<'SOLICITAR' | 'ATUAL' | 'HISTORICO' | 'AVALIACOES' | 'PERFIL' | 'AJUDA'>('SOLICITAR');

  // Passenger Profile state (persisted locally for convenience)
  const [passengerName, setPassengerName] = useState(() => localStorage.getItem('vaicar_passenger_name') || 'Maria Santos');
  const [passengerPhone, setPassengerPhone] = useState(() => localStorage.getItem('vaicar_passenger_phone') || '(12) 99999-0000');
  const [passengerEmail, setPassengerEmail] = useState(() => localStorage.getItem('vaicar_passenger_email') || 'maria.santos@exemplo.com');
  const [passengerAvatarUrl, setPassengerAvatarUrl] = useState(() => localStorage.getItem('vaicar_passenger_avatar') || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80');

  const handlePassengerAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPassengerAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isVerified, setIsVerified] = useState(true);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Search State
  const [originZoneId, setOriginZoneId] = useState<string>(zones[0]?.id || 'z-centro');
  const [destinationZoneId, setDestinationZoneId] = useState<string>(zones[1]?.id || 'z-maresias');
  const [passengers, setPassengers] = useState<number>(1);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledTime, setScheduledTime] = useState<string>('14:00');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchDriversResponse | null>(null);
  const [searchConcluded, setSearchConcluded] = useState<boolean>(false);

  // Requesting Ride
  const [selectedDriverForRequest, setSelectedDriverForRequest] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentChangeFor, setPaymentChangeFor] = useState<string>('');
  const [pickupLandmark, setPickupLandmark] = useState<string>('');
  const [pickupMapsLink, setPickupMapsLink] = useState<string>('');
  const [isSubmittingRide, setIsSubmittingRide] = useState<boolean>(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(initialTrackedRide || null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Review modal state
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Help / Denúncia Form state
  const [reportCategory, setReportCategory] = useState('INAPPROPRIATE_BEHAVIOR');
  const [reportTargetName, setReportTargetName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccessMsg, setReportSuccessMsg] = useState(false);

  // Auto-sync active ride from props or from rides list
  useEffect(() => {
    if (initialTrackedRide) {
      setActiveRide(initialTrackedRide);
      setActiveTab('ATUAL');
    }
  }, [initialTrackedRide]);

  // Keep active ride synced with updated rides from backend
  useEffect(() => {
    if (activeRide) {
      const refreshed = allRides.find((r) => r.id === activeRide.id);
      if (refreshed) {
        setActiveRide(refreshed);
      } else {
        // If it was cancelled or deleted from server
        setActiveRide(null);
      }
    } else {
      // Auto-restore any active in-progress ride belonging to this passenger
      const active = allRides.find((r) =>
        (r.passengerPhone === passengerPhone || r.passengerName === passengerName) &&
        ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'PASSENGER_PICKED_UP', 'IN_PROGRESS'].includes(r.status)
      );
      if (active) {
        setActiveRide(active);
        setActiveTab('ATUAL');
      }
    }
  }, [allRides, activeRide, passengerPhone, passengerName]);

  // Ensure default zones if available
  useEffect(() => {
    if (zones.length >= 2 && !originZoneId) {
      setOriginZoneId(zones[0].id);
      setDestinationZoneId(zones[1].id);
    }
  }, [zones]);

  const originZone = zones.find((z) => z.id === originZoneId);
  const destinationZone = zones.find((z) => z.id === destinationZoneId);

  // Filter rides belonging to this passenger
  const myRides = allRides.filter(
    (r) => r.passengerPhone === passengerPhone || r.passengerName === passengerName,
  );

  const handlePerformSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!originZoneId || !destinationZoneId) return;

    try {
      setIsSearching(true);
      setSearchConcluded(false);
      const res = await searchDrivers(originZoneId, destinationZoneId, passengers);
      setSearchResults(res);
      setSearchConcluded(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao buscar motoristas');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmRequest = async () => {
    if (!selectedDriverForRequest || !originZone || !destinationZone) return;

    try {
      setIsSubmittingRide(true);
      const newRide = await createRide({
        driverId: selectedDriverForRequest.driverId,
        passengerName,
        passengerPhone,
        passengerAvatarUrl, // <--- Pass avatar
        passengerCount: passengers,
        originZoneId: originZone.id,
        destinationZoneId: destinationZone.id,
        originAddress: `${originZone.name}, São Sebastião - SP`,
        destinationAddress: `${destinationZone.name}, São Sebastião - SP`,
        originLandmark: pickupLandmark, // <--- Pass exact landmark
        originMapsLink: pickupMapsLink, // <--- Pass maps link
        estimatedDistanceKm: searchResults?.distanceKm || 12,
        estimatedDurationMin: searchResults?.estimatedDurationMin || 20,
        estimatedPrice: selectedDriverForRequest.fare,
        paymentMethod: selectedPaymentMethod,
        paymentChangeFor: selectedPaymentMethod === 'CASH' && paymentChangeFor ? Number(paymentChangeFor) : undefined,
      });

      // Clear specific pickup inputs
      setPickupLandmark('');
      setPickupMapsLink('');
      setSelectedDriverForRequest(null);
      setActiveRide(newRide);
      setActiveTab('ATUAL');
      onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar corrida');
    } finally {
      setIsSubmittingRide(false);
    }
  };

  const handleCancelCurrentRide = async () => {
    if (!activeRide) return;
    if (!window.confirm('Tem certeza de que deseja cancelar esta solicitação de corrida?')) return;

    try {
      const updated = await updateRideStatus(activeRide.id, 'CANCELLED_BY_PASSENGER', 'Cancelado pelo passageiro');
      setActiveRide(updated);
      onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar corrida');
    }
  };

  const handleConfirmPaymentDirect = async () => {
    if (!activeRide) return;
    try {
      const updated = await updateRidePaymentStatus(activeRide.id, 'PAID');
      setActiveRide(updated);
      onRefreshRides();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar pagamento');
    }
  };

  const handleCopyPixKey = () => {
    if (activeRide?.pixKey) {
      navigator.clipboard.writeText(activeRide.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeRide) return;
    try {
      await submitReview({
        rideId: activeRide.id,
        reviewerRole: 'PASSENGER',
        reviewerName: passengerName,
        driverId: activeRide.driverId,
        rating: ratingInput,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      onRefreshRides();
      setTimeout(() => {
        setReviewSubmitted(false);
        setReviewComment('');
      }, 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar avaliação');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await passengerAuth({
        name: passengerName,
        phone: passengerPhone,
        email: passengerEmail,
        verificationCode: verificationCodeInput || undefined,
        avatarUrl: passengerAvatarUrl, // <--- Added!
      });
      if (res.codeSent) {
        setCodeRequested(true);
        setAuthMessage(`Código de validação enviado! (Em ambiente de teste, utilize o código: ${res.testCode})`);
      } else if (res.success) {
        setIsVerified(true);
        setCodeRequested(false);
        setVerificationCodeInput('');
        setAuthMessage('Perfil verificado e salvo com sucesso!');
        localStorage.setItem('vaicar_passenger_name', passengerName);
        localStorage.setItem('vaicar_passenger_phone', passengerPhone);
        localStorage.setItem('vaicar_passenger_email', passengerEmail);
        localStorage.setItem('vaicar_passenger_avatar', passengerAvatarUrl); // <--- Added!
      }
    } catch (err: any) {
      setAuthMessage(err.message || 'Erro ao validar perfil');
    }
  };

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccessMsg(true);
    setReportDescription('');
    setReportTargetName('');
    setTimeout(() => setReportSuccessMsg(false), 4000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Passenger Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl scrollbar-none">
        <button
          onClick={() => setActiveTab('SOLICITAR')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SOLICITAR'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Solicitar Corrida</span>
        </button>

        <button
          onClick={() => setActiveTab('ATUAL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'ATUAL'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Corrida Atual</span>
          {activeRide && !['COMPLETED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED'].includes(activeRide.status) && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORICO')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'HISTORICO'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico ({myRides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AVALIACOES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'AVALIACOES'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Avaliações</span>
        </button>

        <button
          onClick={() => setActiveTab('PERFIL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'PERFIL'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Perfil</span>
        </button>

        <button
          onClick={() => setActiveTab('AJUDA')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'AJUDA'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Ajuda & Denúncia</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: SOLICITAR CORRIDA */}
      {/* ========================================================================= */}
      {activeTab === 'SOLICITAR' && (
        <div className="space-y-6">
          {/* Main Search Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="mb-5 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Car className="w-6 h-6 text-emerald-400" />
                Solicitar Viagem em São Sebastião
              </h2>
              <p className="text-xs text-slate-400">
                Selecione as zonas de origem e destino para consultar motoristas credenciados disponíveis.
              </p>
            </div>

            {/* Mandatory Disclaimers as required by Section 3 & 25 */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Preço Direto:</span>
                  O preço da corrida é definido pelo motorista.
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-start gap-2.5 text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Pagamento Direto:</span>
                  O pagamento da corrida é realizado diretamente com o motorista.
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePerformSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origin */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    De onde? (Origem)
                  </label>
                  <select
                    value={originZoneId}
                    onChange={(e) => setOriginZoneId(e.target.value)}
                    className="w-full bg-slate-950 text-white font-medium px-4 py-3 rounded-xl border border-slate-700/80 focus:border-emerald-500 outline-none cursor-pointer text-sm"
                  >
                    {zones.map((zone) => (
                      <option key={`orig-${zone.id}`} value={zone.id}>
                        📍 {zone.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    Para onde? (Destino)
                  </label>
                  <select
                    value={destinationZoneId}
                    onChange={(e) => setDestinationZoneId(e.target.value)}
                    className="w-full bg-slate-950 text-white font-medium px-4 py-3 rounded-xl border border-slate-700/80 focus:border-emerald-500 outline-none cursor-pointer text-sm"
                  >
                    {zones.map((zone) => (
                      <option key={`dest-${zone.id}`} value={zone.id}>
                        🏁 {zone.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule & Passenger Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Passengers */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Quantidade de Passageiros
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700/80">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPassengers(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          passengers === num
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {num} {num === 1 ? 'pessoa' : 'pessoas'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Horário da Corrida
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType('NOW')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        scheduleType === 'NOW'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      Agora (Imediato)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType('LATER')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        scheduleType === 'LATER'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </div>

              {/* Map Service Notice */}
              <div className="text-[11px] text-slate-500 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>ℹ️ Serviço de mapas não configurado. Distâncias estimadas pela malha viária municipal (SP-055).</span>
                <span className="text-emerald-400 font-semibold cursor-pointer" onClick={() => onOpenLegal('regulacao')}>
                  Ver Regulação
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSearching}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Buscando motoristas cadastrados...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Pesquisar Motoristas Disponíveis</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Search Results Area */}
          {searchConcluded && searchResults && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Motoristas Disponíveis</span>
                    <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      {searchResults.totalFound} {searchResults.totalFound === 1 ? 'encontrado' : 'encontrados'}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Estimativa de trajeto: {searchResults.distanceKm} km • ~{searchResults.estimatedDurationMin} min
                  </span>
                </div>

                {/* Dynamic Pricing Alert */}
                {searchResults.isDynamicActive && (
                  <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${
                    searchResults.dynamicMultiplier > 1.0 
                      ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' 
                      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {searchResults.dynamicMultiplier > 1.0 
                        ? `Tarifa de Alta Demanda Ativa (${searchResults.dynamicMultiplier}x)` 
                        : `Tarifa com Desconto Promocional (${searchResults.dynamicMultiplier}x)`}
                    </span>
                    <span className="ml-auto opacity-70 font-normal">Ajustado pela oferta/demanda local</span>
                  </div>
                )}
              </div>

              {/* Empty state when 0 drivers available */}
              {searchResults.results.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Car className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Nenhum motorista disponível no momento.</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Não há motoristas profissionais credenciados e online para esta rota no momento. Tente novamente em alguns minutos.
                  </p>
                  <button
                    onClick={onGoToDriverSignup}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    + Cadastrar como Motorista
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.results.map((driver) => (
                    <div
                      key={driver.driverId}
                      className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 space-y-4 transition-all shadow-lg relative group"
                    >
                      {/* Driver info header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={driver.avatarUrl}
                            alt={driver.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-white text-sm">{driver.name}</h4>
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1 rounded font-semibold">
                                Credenciado
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{driver.vehicle.brand} {driver.vehicle.model} • {driver.vehicle.color}</p>
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mt-0.5">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{driver.ratingAverage.toFixed(1)}</span>
                              <span className="text-slate-500 font-normal">({driver.ratingCount} avaliações)</span>
                            </div>
                          </div>
                        </div>

                        {/* Price badge */}
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Preço do motorista</span>
                          <span className="text-xl font-black text-emerald-400">R$ {driver.fare.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Chegada em ~{driver.arrivalTimeMin} min</span>
                        <span className="text-slate-400">Capacidade: {driver.vehicle.capacity} passageiros</span>
                      </div>

                      {/* Select driver for ride button */}
                      <button
                        onClick={() => setSelectedDriverForRequest(driver)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md"
                      >
                        <span>Escolher este Motorista</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal to Confirm Ride and choose payment method */}
          {selectedDriverForRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Car className="w-5 h-5 text-emerald-400" />
                    Confirmar Solicitação de Corrida
                  </h3>
                  <button
                    onClick={() => setSelectedDriverForRequest(null)}
                    className="text-slate-400 hover:text-white cursor-pointer text-xs"
                  >
                    Fechar
                  </button>
                </div>

                {/* Driver summary */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedDriverForRequest.avatarUrl}
                      alt={selectedDriverForRequest.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{selectedDriverForRequest.name}</h4>
                      <p className="text-xs text-slate-400">
                        {selectedDriverForRequest.vehicle.brand} {selectedDriverForRequest.vehicle.model}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total combinado</span>
                    <span className="text-lg font-black text-emerald-400">
                      R$ {selectedDriverForRequest.fare.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Route Summary */}
                <div className="text-xs space-y-1 text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">Origem:</span>
                    <span>{originZone?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">Destino:</span>
                    <span>{destinationZone?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>Passageiros: {passengers}</span>
                    <span>•</span>
                    <span>Distância estimada: {searchResults?.distanceKm || 12} km</span>
                  </div>
                </div>

                {/* Localização Exata para Embarque */}
                <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Localização Exata de Embarque *
                  </label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Ponto de Referência / Número / Instrução específica:</span>
                      <input
                        type="text"
                        placeholder="Ex: Em frente à Padaria Maresias, portão branco"
                        value={pickupLandmark}
                        onChange={(e) => setPickupLandmark(e.target.value)}
                        required
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">Link do Google Maps do local exato (Opcional):</span>
                      <input
                        type="url"
                        placeholder="Ex: https://maps.google.com/?q=-23.79..."
                        value={pickupMapsLink}
                        onChange={(e) => setPickupMapsLink(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector (Direct payment to driver) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Forma de Pagamento Direto com o Motorista:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('PIX')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'PIX'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Pix Direto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CASH')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'CASH'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Banknote className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Dinheiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CARD_DEBIT')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedPaymentMethod === 'CARD_DEBIT' || selectedPaymentMethod === 'CARD_CREDIT'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Maquininha</span>
                    </button>
                  </div>

                  {selectedPaymentMethod === 'CASH' && (
                    <div className="pt-2">
                      <label className="text-[11px] text-slate-400 block mb-1">Precisa de troco para quanto? (Opcional)</label>
                      <input
                        type="number"
                        placeholder="Ex: 50 ou 100"
                        value={paymentChangeFor}
                        onChange={(e) => setPaymentChangeFor(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDriverForRequest(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRequest}
                    disabled={isSubmittingRide}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs cursor-pointer transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmittingRide ? (
                      <span>Enviando solicitação...</span>
                    ) : (
                      <span>Confirmar e Chamar</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CORRIDA ATUAL */}
      {/* ========================================================================= */}
      {activeTab === 'ATUAL' && (
        <div className="space-y-6">
          {!activeRide || ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'EXPIRED'].includes(activeRide.status) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Car className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Nenhuma corrida em andamento no momento.</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Quando você solicitar uma viagem, poderá acompanhar o status em tempo real, os dados do motorista e o pagamento nesta tela.
              </p>
              <button
                onClick={() => setActiveTab('SOLICITAR')}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-all shadow-md"
              >
                Solicitar uma Corrida Agora
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-lg font-bold text-white">Acompanhamento da Corrida</h3>
                  </div>
                  <p className="text-xs text-slate-400">Código de controle: #{activeRide.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                    {activeRide.status === 'REQUESTED' && 'Aguardando Motorista'}
                    {activeRide.status === 'ACCEPTED' && 'Motorista Aceitou'}
                    {activeRide.status === 'DRIVER_ARRIVING' && 'Motorista Chegando'}
                    {activeRide.status === 'PASSENGER_PICKED_UP' && 'Embarcado'}
                    {activeRide.status === 'IN_PROGRESS' && 'Em Andamento'}
                    {activeRide.status === 'COMPLETED' && 'Corrida Concluída'}
                  </span>
                </div>
              </div>

              {/* Live GPS Map & Progress Simulation Component */}
              <LiveRideTracker ride={activeRide} />

              {/* Driver and Vehicle card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={activeRide.driverAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                    alt={activeRide.driverName}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="font-bold text-white text-base">{activeRide.driverName}</h4>
                    <p className="text-xs text-emerald-400 font-semibold">{activeRide.driverVehicle}</p>
                    <p className="text-xs text-slate-400">Tel: {activeRide.driverPhone}</p>
                  </div>
                </div>

                {/* Quick actions: WhatsApp and Call */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const contact = await getWhatsAppContact(activeRide.id);
                        if (contact?.whatsappUrl) {
                          window.open(contact.whatsappUrl, '_blank');
                        }
                      } catch {
                        const cleanPhone = activeRide.driverPhone.replace(/\D/g, '');
                        const msg = encodeURIComponent(
                          `Olá ${activeRide.driverName}! Sou ${activeRide.passengerName}, seu passageiro no VaiCar na corrida #${activeRide.id}.`
                        );
                        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>

                  {activeRide.status !== 'COMPLETED' && (
                    <button
                      onClick={handleCancelCurrentRide}
                      className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Ride Route and Distance details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block font-semibold">Origem:</span>
                      <span className="text-white font-medium">{activeRide.originAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 block font-semibold">Destino:</span>
                      <span className="text-white font-medium">{activeRide.destinationAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Payment Box */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Valor da corrida:</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {activeRide.estimatedPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs flex items-center justify-between text-slate-300">
                    <span>Método combinado:</span>
                    <span className="font-bold text-white uppercase">{activeRide.paymentMethod}</span>
                  </div>

                  {activeRide.pixKey && (
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block">Chave Pix do Motorista:</span>
                        <span className="font-mono text-xs text-white font-bold">{activeRide.pixKey}</span>
                      </div>
                      <button
                        onClick={handleCopyPixKey}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer transition-colors"
                        title="Copiar Chave Pix"
                      >
                        {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Status do Pagamento: {activeRide.paymentStatus === 'PAID' || activeRide.paymentStatus === 'CONFIRMED_BY_DRIVER' ? '🟢 Pago' : '🟡 Pendente'}
                    </span>
                    {activeRide.paymentStatus !== 'PAID' && activeRide.paymentStatus !== 'CONFIRMED_BY_DRIVER' && (
                      <button
                        onClick={handleConfirmPaymentDirect}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                      >
                        Marcar como Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Buttons as required by Section 3 */}
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Em caso de perigo ou emergência durante a corrida:</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:190"
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Ligar 190 (Polícia)</span>
                  </a>
                  <a
                    href="tel:192"
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>192 (SAMU)</span>
                  </a>
                  <a
                    href="tel:153"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <span>153 (Guarda)</span>
                  </a>
                </div>
              </div>

              {/* Review Section when completed */}
              {activeRide.status === 'COMPLETED' && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-xl space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Avaliar esta Corrida
                  </h4>
                  {reviewSubmitted ? (
                    <div className="text-emerald-400 text-xs font-bold">
                      Obrigado! Sua avaliação foi registrada com sucesso.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRatingInput(star)}
                            className="text-amber-400 cursor-pointer hover:scale-110 transition-transform"
                          >
                            <Star className={`w-6 h-6 ${star <= ratingInput ? 'fill-amber-400' : 'text-slate-600'}`} />
                          </button>
                        ))}
                        <span className="text-xs text-slate-400 ml-2">Nota: {ratingInput} de 5</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Deixe um comentário sobre a viagem..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none"
                      />
                      <button
                        onClick={handleSubmitReview}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-md"
                      >
                        Enviar Avaliação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE CORRIDAS */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Histórico de Viagens
            </h3>
            <span className="text-xs text-slate-400">Total: {myRides.length}</span>
          </div>

          {myRides.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">Nenhuma corrida encontrada.</p>
              <p className="text-xs text-slate-500">
                Você ainda não realizou viagens nesta plataforma. Quando solicitar sua primeira corrida, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{ride.driverName}</span>
                      <span className="text-slate-400">• {ride.driverVehicle}</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {ride.status}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      {ride.originAddress} ➔ {ride.destinationAddress}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(ride.createdAt).toLocaleString('pt-BR')} • Pagamento: {ride.paymentMethod}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 block">
                      R$ {ride.estimatedPrice.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {ride.paymentStatus === 'PAID' || ride.paymentStatus === 'CONFIRMED_BY_DRIVER' ? '🟢 Pago' : '🟡 Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: AVALIAÇÕES */}
      {/* ========================================================================= */}
      {activeTab === 'AVALIACOES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Avaliações do Passageiro
            </h3>
          </div>

          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">Ainda não possui avaliações.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ao concluir viagens, as notas e comentários recebidos dos motoristas e enviados por você serão exibidos nesta aba.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: PERFIL DO PASSAGEIRO */}
      {/* ========================================================================= */}
      {activeTab === 'PERFIL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Perfil do Passageiro
            </h3>
            <p className="text-xs text-slate-400">
              Identificação utilizada exclusivamente para que o motorista localize e confirme seu embarque.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            {/* Foto de Perfil do Passageiro */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">Sua Foto de Perfil (Opcional - Recomendado) *</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={passengerAvatarUrl}
                    alt="Sua foto"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePassengerAvatarChange}
                    className="hidden"
                    id="passenger-avatar-upload"
                  />
                  <label
                    htmlFor="passenger-avatar-upload"
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-all border border-slate-700"
                  >
                    Selecionar Foto do Dispositivo
                  </label>
                  <p className="text-[10px] text-slate-400">Ajuda o motorista a te identificar visualmente no local de embarque.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nome Completo</label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                required
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">WhatsApp / Telefone</label>
              <input
                type="text"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                required
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">E-mail (Opcional)</label>
              <input
                type="email"
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              />
            </div>

            {codeRequested && (
              <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                <label className="text-xs font-bold text-emerald-400">Código de Verificação SMS/WhatsApp</label>
                <input
                  type="text"
                  placeholder="Digite 8492"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value)}
                  className="w-full bg-slate-900 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 outline-none font-mono"
                />
              </div>
            )}

            {authMessage && (
              <p className="text-xs text-emerald-400 font-semibold">{authMessage}</p>
            )}

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
            >
              {codeRequested ? 'Confirmar Código e Salvar' : 'Atualizar / Validar Perfil'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: AJUDA E DENÚNCIA */}
      {/* ========================================================================= */}
      {activeTab === 'AJUDA' && (
        <div className="space-y-6">
          {/* FAQ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              Perguntas Frequentes & Funcionamento
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Como funciona o pagamento da corrida?</h4>
                <p>
                  O pagamento é feito diretamente ao motorista (via Pix direto, dinheiro ou máquina de cartão dele). O VaiCar não intermedeia o dinheiro das corridas e não cobra comissão sobre viagens.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">Os motoristas são autorizados em São Sebastião?</h4>
                <p>
                  Sim! Todos os motoristas ativos na plataforma passam por verificação prévia de CNH com EAR, alvará municipal de São Sebastião, laudo de vistoria veicular e seguro APP de acidentes para passageiros.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <h4 className="font-bold text-white">O que fazer se esqueci um objeto no veículo?</h4>
                <p>
                  Você pode entrar em contato diretamente com o motorista pelo histórico de corridas ou registrar o relato no formulário abaixo com os detalhes da corrida.
                </p>
              </div>
            </div>
          </div>

          {/* Form de Denúncia e Item Esquecido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Canal de Denúncia e Itens Esquecidos
            </h3>

            {reportSuccessMsg ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl text-xs text-emerald-300 font-bold">
                Relato registrado com sucesso! O departamento de auditoria analisará o chamado com prioridade.
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Tipo de Relato</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                    >
                      <option value="INAPPROPRIATE_BEHAVIOR">Conduta Inadequada do Motorista</option>
                      <option value="DIFFERENT_VEHICLE">Veículo Diferente do Cadastrado</option>
                      <option value="DIFFERENT_FARE">Cobrança Diferente da Combinada</option>
                      <option value="LOST_ITEM">Objeto ou Pertence Esquecido no Carro</option>
                      <option value="SAFETY_ISSUE">Segurança ou Direção Perigosa</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Nome do Motorista ou Código da Corrida</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva ou #ride-1"
                      value={reportTargetName}
                      onChange={(e) => setReportTargetName(e.target.value)}
                      required
                      className="w-full bg-slate-950 text-white px-3 py-2 rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Descreva o ocorrido em detalhes</label>
                  <textarea
                    rows={3}
                    placeholder="Relate com clareza a data, local e os fatos..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    required
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar Chamado</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
