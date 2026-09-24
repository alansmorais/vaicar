import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Printer,
  Calendar,
  Clock,
  MapPin,
  Car,
  User,
  ShieldCheck,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
} from 'lucide-react';
import { RideReceipt, Ride } from '../types.ts';
import { fetchRideReceipt, resendRideReceipt } from '../lib/api.ts';

interface RideReceiptModalProps {
  rideId: string;
  ride?: Ride;
  initialReceipt?: RideReceipt | null;
  onClose: () => void;
}

export const RideReceiptModal: React.FC<RideReceiptModalProps> = ({
  rideId,
  ride,
  initialReceipt,
  onClose,
}) => {
  const [receipt, setReceipt] = useState<RideReceipt | null>(initialReceipt || null);
  const [isLoading, setIsLoading] = useState(!initialReceipt);
  const [error, setError] = useState<string | null>(null);

  // Email resend state
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (initialReceipt) {
      setReceipt(initialReceipt);
      setEmailInput(initialReceipt.passengerEmail || '');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchRideReceipt(rideId)
      .then((data) => {
        if (isMounted) {
          setReceipt(data);
          setEmailInput(data.passengerEmail || '');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Não foi possível carregar o comprovante da corrida.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rideId, initialReceipt]);

  const handleCopyCode = () => {
    if (!receipt?.receiptCode) return;
    navigator.clipboard.writeText(receipt.receiptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Digite um endereço de e-mail válido.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await resendRideReceipt(rideId, emailInput.trim());
      setEmailStatus({ type: 'success', message: res.message || 'Comprovante reenviado com sucesso!' });
      if (res.receipt) setReceipt(res.receipt);
    } catch (err: any) {
      setEmailStatus({ type: 'error', message: err.message || 'Falha ao reenviar e-mail.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPdf = () => {
    const pdfUrl = `/api/v1/rides/${rideId}/receipt/pdf`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `comprovante-vaicar-${receipt?.receiptCode || rideId}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatBrl = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'R$ 0,00';
    return `R$ ${val.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">Comprovante da Corrida</h3>
              <p className="text-xs text-slate-400">VaiCar São Sebastião • Transporte de Passageiros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Carregando dados oficiais do comprovante...</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold text-rose-300">{error}</p>
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Voltar
              </button>
            </div>
          )}

          {receipt && !isLoading && (
            <>
              {/* Receipt Summary Card */}
              <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                      Viagem Concluída
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">Código:</span>
                      <strong className="text-sm font-black text-white">{receipt.receiptCode}</strong>
                      <button
                        onClick={handleCopyCode}
                        className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                        title="Copiar código"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Emitido em</span>
                    <span className="text-xs font-semibold text-slate-200">{formatDate(receipt.createdAt)}</span>
                  </div>
                </div>

                {/* Itinerary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Embarque / Origem</span>
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      {receipt.originAddress}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Desembarque / Destino</span>
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      {receipt.destinationAddress}
                    </p>
                  </div>
                </div>

                {/* Passenger & Driver Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Passageiro(a)</span>
                    </div>
                    <p className="text-xs font-black text-white">{receipt.passengerName}</p>
                    <p className="text-[11px] text-slate-400">{receipt.passengerPhone || '-'}</p>
                    {receipt.passengerEmail && (
                      <p className="text-[11px] text-slate-400 truncate">{receipt.passengerEmail}</p>
                    )}
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Motorista Parceiro(a)</span>
                    </div>
                    <p className="text-xs font-black text-white">{receipt.driverName}</p>
                    <p className="text-[11px] text-slate-300 font-medium">
                      {receipt.driverVehicle} {receipt.driverLicensePlate ? `• ${receipt.driverLicensePlate}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">{receipt.driverPhone || '-'}</p>
                  </div>
                </div>

                {/* Trip Stats */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Distância</span>
                    <strong className="text-xs text-white">{receipt.distanceKm?.toFixed(1) || '0'} km</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Duração</span>
                    <strong className="text-xs text-white">{receipt.durationMinutes || 0} min</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pagamento</span>
                    <strong className="text-xs text-emerald-400">{receipt.paymentMethod || 'PIX'}</strong>
                  </div>
                </div>

                {/* Values Breakdown */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Tarifa Base / Deslocamento:</span>
                    <span>{formatBrl(receipt.baseFare)}</span>
                  </div>

                  {receipt.waitingMinutes && receipt.waitingMinutes > 0 ? (
                    <div className="flex justify-between text-xs text-amber-300">
                      <span>Tempo de Espera ({receipt.waitingMinutes} min):</span>
                      <span>{formatBrl(receipt.waitingFee)}</span>
                    </div>
                  ) : null}

                  {receipt.dynamicMultiplier && receipt.dynamicMultiplier > 1.0 ? (
                    <div className="flex justify-between text-xs text-emerald-300">
                      <span>Demanda Dinâmica ({receipt.dynamicMultiplier}x):</span>
                      <span className="text-[11px] font-bold">Aplicado</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-sm font-black text-white bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl mt-2">
                    <span className="text-emerald-300">Valor Total da Corrida:</span>
                    <span className="text-base text-emerald-400">{formatBrl(receipt.finalTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Email Resend Form */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Enviar Comprovante por E-mail</h4>
                </div>

                <form onSubmit={handleResendEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    disabled={isSendingEmail}
                  />
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </form>

                {emailStatus && (
                  <p
                    className={`text-xs ${
                      emailStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {emailStatus.message}
                  </p>
                )}
                {receipt.emailDispatchedAt && (
                  <p className="text-[11px] text-slate-400">
                    ✓ Enviado automaticamente para <strong className="text-slate-300">{receipt.emailRecipient || receipt.passengerEmail}</strong> em {formatDate(receipt.emailDispatchedAt)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-slate-400">
                  ID: <span className="font-mono text-slate-400">{receipt.rideId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar PDF</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
