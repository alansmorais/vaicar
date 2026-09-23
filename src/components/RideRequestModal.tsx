import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Banknote,
  CreditCard,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { SearchDriversResponse, Zone, PaymentMethod, SavedCard } from '../types.ts';
import { getSavedCards } from '../lib/cards.ts';
import { CardManagerModal } from './CardManagerModal.tsx';

interface RideRequestModalProps {
  driver: SearchDriversResponse['results'][0];
  originZone: Zone;
  destinationZone: Zone;
  passengerCount: number;
  onClose: () => void;
  onSubmitRequest: (passengerData: {
    name: string;
    phone: string;
    paymentMethod: PaymentMethod;
    paymentChangeFor?: number;
    savedCard?: SavedCard;
  }) => void;
  isLoading: boolean;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({
  driver,
  originZone,
  destinationZone,
  passengerCount,
  onClose,
  onSubmitRequest,
  isLoading,
}) => {
  const [passengerName, setPassengerName] = useState<string>(
    localStorage.getItem('vaicar_passenger_name') || 'Camila Rocha',
  );
  const [passengerPhone, setPassengerPhone] = useState<string>(
    localStorage.getItem('vaicar_passenger_phone') || '(11) 98765-4321',
  );

  // Payment Method States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [needsChange, setNeedsChange] = useState<boolean>(false);
  const [changeForAmount, setChangeForAmount] = useState<string>('100');

  // Saved Cards Management
  const [savedCards, setSavedCards] = useState<SavedCard[]>(getSavedCards());
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(() => {
    const list = getSavedCards();
    return list.find((c) => c.isDefault) || list[0] || null;
  });
  const [isCardManagerOpen, setIsCardManagerOpen] = useState<boolean>(false);
  const [usePhysicalMachine, setUsePhysicalMachine] = useState<boolean>(false);

  useEffect(() => {
    const current = getSavedCards();
    setSavedCards(current);
    if (!selectedCard && current.length > 0) {
      setSelectedCard(current.find((c) => c.isDefault) || current[0]);
    }
  }, [isCardManagerOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerPhone.trim()) return;

    if (
      (paymentMethod === 'CARD_CREDIT' || paymentMethod === 'CARD_DEBIT') &&
      !selectedCard &&
      !usePhysicalMachine
    ) {
      alert('Selecione ou cadastre um cartão, ou opte pela maquininha física.');
      return;
    }

    localStorage.setItem('vaicar_passenger_name', passengerName);
    localStorage.setItem('vaicar_passenger_phone', passengerPhone);

    const changeNum =
      paymentMethod === 'CASH' && needsChange ? Number(changeForAmount) || 0 : undefined;

    onSubmitRequest({
      name: passengerName,
      phone: passengerPhone,
      paymentMethod,
      paymentChangeFor: changeNum,
      savedCard:
        paymentMethod === 'CARD_CREDIT' || paymentMethod === 'CARD_DEBIT'
          ? selectedCard || undefined
          : undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl relative my-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Confirmar Solicitação
            </span>
            <h2 className="text-xl font-black text-white mt-1">Sua solicitação de corrida</h2>
            <p className="text-xs text-slate-400">
              Escolha a forma de pagamento e informe seus dados de contato
            </p>
          </div>

          {/* Ride Details Summary Card */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 space-y-3 text-xs">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <img
                src={driver.avatarUrl}
                alt={driver.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-bold text-white text-sm">{driver.name}</h4>
                <p className="text-slate-400">
                  {driver.vehicle.brand} {driver.vehicle.model} • {driver.vehicle.color}
                </p>
                <p className="text-emerald-400 font-medium">Tempo de chegada: ~{driver.arrivalTimeMin} min</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Origem</span>
                  <span className="text-white font-bold">{originZone.name}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Destino</span>
                  <span className="text-white font-bold">{destinationZone.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {passengerCount} {passengerCount === 1 ? 'passageiro' : 'passageiros'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total combinado</span>
                <span className="text-xl font-black text-emerald-400">R$ {driver.fare}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PAYMENT METHOD SELECTION */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Forma de Pagamento
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. PIX */}
                <button
                  type="button"
                  id="pay-pix-btn"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'PIX'
                      ? 'bg-teal-950/60 border-teal-500 text-white ring-1 ring-teal-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'PIX'
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-teal-400'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold">Pix</span>
                  <span className="text-[10px] text-teal-400">Instantâneo</span>
                </button>

                {/* 2. DINHEIRO */}
                <button
                  type="button"
                  id="pay-cash-btn"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-emerald-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold">Dinheiro</span>
                  <span className="text-[10px] text-emerald-400">Em espécie</span>
                </button>

                {/* 3. CARTÃO CADASTRADO */}
                <button
                  type="button"
                  id="pay-card-btn"
                  onClick={() => {
                    if (selectedCard?.type === 'DEBIT') {
                      setPaymentMethod('CARD_DEBIT');
                    } else {
                      setPaymentMethod('CARD_CREDIT');
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CARD_CREDIT' || paymentMethod === 'CARD_DEBIT'
                      ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      paymentMethod === 'CARD_CREDIT' || paymentMethod === 'CARD_DEBIT'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-indigo-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold">Cartão</span>
                  <span className="text-[10px] text-indigo-400">Cadastrado</span>
                </button>
              </div>

              {/* DETAILS FOR CHOSEN METHOD */}
              {/* PIX DETAILS */}
              {paymentMethod === 'PIX' && (
                <div className="bg-teal-950/30 border border-teal-500/30 p-3.5 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-teal-300">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Pagamento direto via Pix ao motorista</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Você terá acesso à chave Pix e QR Code do motorista assim que ele aceitar a corrida. Sem taxas adicionais.
                  </p>
                </div>
              )}

              {/* DINHEIRO DETAILS & TROCO */}
              {paymentMethod === 'CASH' && (
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold">Precisa de troco?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNeedsChange(false)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                          !needsChange
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Não
                      </button>
                      <button
                        type="button"
                        onClick={() => setNeedsChange(true)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                          needsChange
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Sim
                      </button>
                    </div>
                  </div>

                  {needsChange && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      <span className="text-slate-400 text-xs whitespace-nowrap">Troco para:</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-slate-500 text-xs">R$</span>
                        <input
                          type="number"
                          value={changeForAmount}
                          onChange={(e) => setChangeForAmount(e.target.value)}
                          placeholder="50, 100..."
                          className="w-full bg-slate-900 text-white font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-1">
                        {['50', '100'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setChangeForAmount(val)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            R$ {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARTÃO CADASTRADO DETAILS */}
              {(paymentMethod === 'CARD_CREDIT' || paymentMethod === 'CARD_DEBIT') && (
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-3 text-xs">
                  {/* Card selector / preview */}
                  {selectedCard ? (
                    <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-700/80">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[9px] uppercase text-slate-300">
                          {selectedCard.brand}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold text-xs">
                              {selectedCard.nickname || selectedCard.brand.toUpperCase()}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1 rounded uppercase ${
                                selectedCard.type === 'CREDIT'
                                  ? 'bg-indigo-950 text-indigo-300'
                                  : 'bg-teal-950 text-teal-300'
                              }`}
                            >
                              {selectedCard.type === 'CREDIT' ? 'Crédito' : 'Débito'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            •••• {selectedCard.last4} (Expira {selectedCard.expiryMonth}/{selectedCard.expiryYear})
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCardManagerOpen(true)}
                        className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer ml-2"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <button
                        type="button"
                        onClick={() => setIsCardManagerOpen(true)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/40 text-indigo-300 text-xs font-bold hover:bg-indigo-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Cartão de Crédito ou Débito</span>
                      </button>
                    </div>
                  )}

                  {/* Toggle: Physical Card Machine */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">
                      Prefere pagar na maquininha do carro?
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsePhysicalMachine(!usePhysicalMachine)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        usePhysicalMachine
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {usePhysicalMachine ? 'Maquininha no carro' : 'No App'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Passenger Contact Input (Zero friction) */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Seu nome completo
                </label>
                <input
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Ex: Camila Rocha"
                  className="w-full bg-slate-950 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Seu WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  required
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="Ex: (12) 99888-7766"
                  className="w-full bg-slate-950 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Utilizado para o motorista combinar os detalhes de embarque e enviar a chave Pix/comprovante.
                </p>
              </div>
            </div>

            <button
              id="confirm-ride-request-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Enviando solicitação...' : 'SOLICITAR CORRIDA AGORA'}
            </button>
          </form>
        </div>
      </div>

      {/* Card Manager Modal */}
      {isCardManagerOpen && (
        <CardManagerModal
          onClose={() => setIsCardManagerOpen(false)}
          selectedCardId={selectedCard?.id}
          onSelectCard={(card) => {
            setSelectedCard(card);
            setPaymentMethod(card.type === 'CREDIT' ? 'CARD_CREDIT' : 'CARD_DEBIT');
            setIsCardManagerOpen(false);
          }}
        />
      )}
    </>
  );
};
