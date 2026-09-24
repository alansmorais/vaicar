import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Star,
  Car,
  Zap,
  Banknote,
  CreditCard,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { Ride, RideStatus } from '../types.ts';
import { updateRideStatus, getWhatsAppContact } from '../lib/api.ts';

interface RideTrackerModalProps {
  ride: Ride;
  onClose: () => void;
  onRefreshRide: (updatedRide: Ride) => void;
  onOpenReview: (ride: Ride) => void;
  onOpenReport: (ride: Ride) => void;
}

export const RideTrackerModal: React.FC<RideTrackerModalProps> = ({
  ride,
  onClose,
  onRefreshRide,
  onOpenReview,
  onOpenReport,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [showPixQrCode, setShowPixQrCode] = useState(false);

  // Status mapping
  const statusLabels: Record<RideStatus, { title: string; desc: string; color: string }> = {
    REQUESTED: {
      title: 'Aguardando confirmação do motorista',
      desc: 'O motorista recebeu sua solicitação em São Sebastião e responderá em instantes.',
      color: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
    },
    QUEUED: {
      title: 'Motorista em corrida anterior',
      desc: 'O motorista está finalizando uma viagem próxima e atenderá você em seguida.',
      color: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
    },
    ACCEPTED: {
      title: 'Corrida Aceita!',
      desc: 'O motorista confirmou sua corrida e já está se preparando para o embarque.',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
    },
    DRIVER_ARRIVING: {
      title: 'Motorista a caminho',
      desc: 'O veículo está a poucos minutos do seu ponto de embarque.',
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
    },
    PASSENGER_PICKED_UP: {
      title: 'Passageiro a bordo',
      desc: 'Embarque confirmado. Viagem iniciada.',
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/30',
    },
    IN_PROGRESS: {
      title: 'Corrida em andamento',
      desc: 'Seguindo rota pela SP-055 até seu destino com segurança.',
      color: 'text-teal-400 bg-teal-950/60 border-teal-500/30',
    },
    COMPLETED: {
      title: 'Viagem Concluída',
      desc: 'Obrigado por utilizar a plataforma tecnológica VaiCar!',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
    },
    CANCELLED_BY_PASSENGER: {
      title: 'Corrida Cancelada',
      desc: 'Você cancelou esta solicitação.',
      color: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
    },
    CANCELLED_BY_DRIVER: {
      title: 'Solicitação Não Atendida',
      desc: 'O motorista não pôde atender a corrida neste momento.',
      color: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
    },
    CANCELLED: {
      title: 'Corrida Cancelada',
      desc: 'A corrida foi cancelada e o trajeto interrompido.',
      color: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
    },
    REJECTED: {
      title: 'Solicitação Recusada',
      desc: 'A solicitação de corrida não pôde ser atendida.',
      color: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
    },
    EXPIRED: {
      title: 'Tempo Expirado',
      desc: 'A solicitação expirou sem resposta.',
      color: 'text-slate-400 bg-slate-900 border-slate-700',
    },
  };

  const currentStatusInfo = statusLabels[ride.status] || statusLabels.REQUESTED;

  const handleNextStatus = async (nextStatus: RideStatus) => {
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(ride.id, nextStatus);
      onRefreshRide(updated);
      if (nextStatus === 'COMPLETED') {
        onOpenReview(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar corrida');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWhatsAppContact = async () => {
    try {
      setWhatsappLoading(true);
      const data = await getWhatsAppContact(ride.id);
      window.open(data.whatsappUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar contato WhatsApp');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!confirm('Deseja realmente cancelar esta solicitação?')) return;
    try {
      setIsUpdating(true);
      const updated = await updateRideStatus(ride.id, 'CANCELLED_BY_PASSENGER', 'Cancelado pelo usuário');
      onRefreshRide(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-black text-white text-lg">Acompanhamento da Corrida</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Live Status Banner */}
        <div className={`p-4 rounded-2xl border ${currentStatusInfo.color} space-y-1`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider">Status em tempo real</span>
            <span className="text-xs font-semibold">#{ride.id.slice(-6)}</span>
          </div>
          <h3 className="text-base font-extrabold">{currentStatusInfo.title}</h3>
          <p className="text-xs opacity-90">{currentStatusInfo.desc}</p>
        </div>

        {/* Driver Card & Vehicle */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={ride.driverAvatar}
                alt={ride.driverName}
                className="w-13 h-13 rounded-2xl object-cover border border-slate-700 shadow"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-extrabold text-white text-base">{ride.driverName}</h4>
                <p className="text-xs text-slate-300 font-medium">{ride.driverVehicle}</p>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Motorista Verificado VaiCar</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Valor total</span>
              <span className="text-2xl font-black text-emerald-400">R$ {ride.estimatedPrice}</span>
              <span className="text-[9px] text-slate-500 block">Direto ao motorista</span>
            </div>
          </div>

          {/* WhatsApp Direct Contact Button */}
          <div className="pt-2 border-t border-slate-800/80 flex gap-2">
            <button
              onClick={handleWhatsAppContact}
              disabled={whatsappLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{whatsappLoading ? 'Abrindo WhatsApp...' : 'Falar com motorista no WhatsApp'}</span>
            </button>
            <a
              href={`tel:${ride.driverPhone.replace(/\D/g, '')}`}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
              title="Ligar"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Payment Details Section */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Forma de Pagamento
            </span>
            <span className="text-xs font-black text-emerald-400">
              R$ {ride.estimatedPrice.toFixed(2)}
            </span>
          </div>

          {/* PIX */}
          {ride.paymentMethod === 'PIX' && (
            <div className="bg-teal-950/40 border border-teal-500/40 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-xs block">Pagamento via Pix</span>
                    <span className="text-[10px] text-teal-300">Pague direto ao motorista</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPixQrCode(!showPixQrCode)}
                  className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs px-2.5 py-1 rounded-lg font-bold border border-teal-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showPixQrCode ? 'Ocultar QR' : 'Ver QR Code'}</span>
                </button>
              </div>

              {/* Pix Key copy box */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-700">
                <div className="overflow-hidden mr-2">
                  <span className="text-[9px] text-slate-400 block uppercase">Chave Pix do Motorista</span>
                  <span className="text-xs font-mono font-bold text-white truncate block">
                    {ride.pixKey || ride.driverPhone || '123.456.789-00'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(ride.pixKey || ride.driverPhone || '123.456.789-00');
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 2500);
                  }}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              {/* Optional QR Code Preview */}
              {showPixQrCode && (
                <div className="bg-slate-900 p-3 rounded-xl border border-teal-500/30 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow">
                    <div className="w-full h-full border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center text-slate-900">
                      <QrCode className="w-16 h-16 text-teal-600" />
                      <span className="text-[8px] font-black uppercase text-teal-800">Pix R$ {ride.estimatedPrice}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Abra o app do seu banco e aponte a câmera para pagar R$ {ride.estimatedPrice.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASH */}
          {ride.paymentMethod === 'CASH' && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">Pagamento em Dinheiro</span>
                  <span className="text-[10px] text-emerald-300">Em espécie diretamente no veículo</span>
                </div>
              </div>
              {ride.paymentChangeFor ? (
                <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300 flex items-center justify-between">
                  <span>Troco solicitado:</span>
                  <span className="font-bold text-emerald-400">Para R$ {ride.paymentChangeFor}</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Tenha em mãos o valor exato de R$ {ride.estimatedPrice.toFixed(2)} ao desembarcar.
                </p>
              )}
            </div>
          )}

          {/* REGISTERED CARD */}
          {(ride.paymentMethod === 'CARD_CREDIT' || ride.paymentMethod === 'CARD_DEBIT') && (
            <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-white font-bold text-xs block">
                      {ride.savedCard
                        ? `Cartão Cadastrado: ${ride.savedCard.brand.toUpperCase()} final ${ride.savedCard.last4}`
                        : 'Cartão de Crédito / Débito'}
                    </span>
                    <span className="text-[10px] text-indigo-300">
                      {ride.savedCard?.type === 'DEBIT' ? 'Débito Automático' : 'Crédito no App / Maquininha'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  Cadastrado
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pagamento processado com segurança diretamente para a corrida do motorista.
              </p>
            </div>
          )}
        </div>

        {/* Route Details */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              A
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Local de Partida</span>
              <span className="text-white font-semibold">{ride.originAddress}</span>
              {ride.originLandmark && (
                <span className="text-amber-300 text-[10px] block mt-0.5 font-medium">
                  📍 Ponto de Referência: {ride.originLandmark}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800/60">
            <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              B
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Destino</span>
              <span className="text-white font-semibold">{ride.destinationAddress}</span>
            </div>
          </div>

          {/* GPS External Navigation */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ride.originAddress)}&destination=${encodeURIComponent(ride.destinationAddress)}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold text-[11px] py-2 px-2.5 rounded-xl border border-slate-800 hover:border-sky-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Google Maps ↗</span>
            </a>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(ride.destinationAddress)}&navigate=yes`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-bold text-[11px] py-2 px-2.5 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Waze ↗</span>
            </a>
          </div>

          {ride.originMapsLink && (
            <div className="pt-1 text-[11px] text-center">
              <a
                href={ride.originMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold inline-flex items-center gap-1"
              >
                📍 Ver Ponto GPS Exato de Embarque ↗
              </a>
            </div>
          )}
        </div>

        {/* Timeline Log */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Histórico da Viagem
          </span>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            {ride.timeline.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{event.label}</span>
                </span>
                <span className="text-[10px] text-slate-500">{event.timestamp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Simulation Controls (For easy evaluation & workflow test) */}
        {ride.status !== 'COMPLETED' && !ride.status.startsWith('CANCELLED') && (
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-dashed border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400">
                Simulação Rápida (Teste de MVP)
              </span>
              <span className="text-[10px] text-slate-400">Avançar etapas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ride.status === 'REQUESTED' && (
                <button
                  onClick={() => handleNextStatus('ACCEPTED')}
                  disabled={isUpdating}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1.5 rounded-lg font-semibold border border-emerald-500/30 cursor-pointer"
                >
                  Aceitar Corrida ➔
                </button>
              )}
              {ride.status === 'ACCEPTED' && (
                <button
                  onClick={() => handleNextStatus('DRIVER_ARRIVING')}
                  disabled={isUpdating}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs px-2.5 py-1.5 rounded-lg font-semibold border border-cyan-500/30 cursor-pointer"
                >
                  Motorista Chegando ➔
                </button>
              )}
              {ride.status === 'DRIVER_ARRIVING' && (
                <button
                  onClick={() => handleNextStatus('PASSENGER_PICKED_UP')}
                  disabled={isUpdating}
                  className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs px-2.5 py-1.5 rounded-lg font-semibold border border-indigo-500/30 cursor-pointer"
                >
                  Embarque Confirmado ➔
                </button>
              )}
              {ride.status === 'PASSENGER_PICKED_UP' && (
                <button
                  onClick={() => handleNextStatus('IN_PROGRESS')}
                  disabled={isUpdating}
                  className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs px-2.5 py-1.5 rounded-lg font-semibold border border-teal-500/30 cursor-pointer"
                >
                  Viagem em Andamento ➔
                </button>
              )}
              {ride.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => handleNextStatus('COMPLETED')}
                  disabled={isUpdating}
                  className="bg-emerald-500 text-slate-950 text-xs px-3 py-1.5 rounded-lg font-bold shadow cursor-pointer"
                >
                  Finalizar e Concluir Viagem ✔
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions: Cancel or Review */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          {ride.status === 'COMPLETED' ? (
            <button
              onClick={() => onOpenReview(ride)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Star className="w-4 h-4 fill-slate-950" />
              <span>AVALIAR O MOTORISTA</span>
            </button>
          ) : (
            <>
              {!ride.status.startsWith('CANCELLED') && (
                <button
                  onClick={handleCancelRide}
                  disabled={isUpdating}
                  className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Cancelar Corrida
                </button>
              )}
              <button
                onClick={() => onOpenReport(ride)}
                className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Denunciar problema</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
