import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Ride } from '../types.ts';
import { submitReport } from '../lib/api.ts';

interface ReportModalProps {
  ride?: Ride | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ ride, onClose }) => {
  const [category, setCategory] = useState<string>('DIVERGENCIA_VEICULO');
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>(
    ride?.passengerName || localStorage.getItem('vaicar_passenger_name') || 'Passageiro',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const categories = [
    { value: 'DIVERGENCIA_VEICULO', label: 'Divergência de motorista ou veículo (placa/modelo não confere)' },
    { value: 'COMPORTAMENTO_INADEQUADO', label: 'Comportamento inadequado, assédio ou desrespeito' },
    { value: 'PROBLEMA_VIAGEM', label: 'Problema durante a viagem ou direção perigosa' },
    { value: 'ACIDENTE', label: 'Acidente ou incidente de trânsito' },
    { value: 'PROBLEMA_PAGAMENTO', label: 'Problema de pagamento ou cobrança indevida' },
    { value: 'OBJETO_PERDIDO', label: 'Objeto esquecido no veículo' },
    { value: 'OUTRA_SEGURANCA', label: 'Outra questão de segurança ou integridade' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor descreva o ocorrido detalhadamente.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReport({
        rideId: ride?.id,
        reporterType: 'PASSENGER',
        reporterName,
        targetType: 'DRIVER',
        targetName: ride?.driverName || 'Motorista',
        category,
        description,
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar relato para auditoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-xl font-black text-white">Reportar Ocorrência de Segurança</h2>
          </div>
          <p className="text-xs text-slate-400">
            {ride ? `Ocorrência vinculada à corrida #${ride.id} (${ride.driverName})` : 'Canal oficial de auditoria e integridade do VaiCar'}
          </p>
        </div>

        {/* Emergency Notice */}
        <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-xl text-xs space-y-1 text-rose-200">
          <p className="font-bold flex items-center gap-1.5 text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            Em caso de emergência ou risco iminente:
          </p>
          <p className="text-[11px] text-slate-300">
            Ligue imediatamente para o <strong>190 (Polícia Militar)</strong> ou <strong>192 (SAMU)</strong>. Este formulário destina-se à apuração administrativa e moderação da plataforma.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Ocorrência Registrada com Sucesso</h3>
            <p className="text-xs text-slate-300">
              Seu relato foi salvo e encaminhado para a equipe de moderação de São Sebastião para averiguação.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Classificação do Problema</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Seu Nome de Identificação</label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Descreva detalhadamente o ocorrido
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Informe data, local e os fatos objetivos observados (ex: placa do veículo não correspondia ao app)..."
                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500 resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Registrando ocorrência...' : 'REGISTRAR OCORRÊNCIA PARA AUDITORIA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
