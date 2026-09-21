import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Ride } from '../types.ts';
import { submitReport } from '../lib/api.ts';

interface ReportModalProps {
  ride?: Ride | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ ride, onClose }) => {
  const [category, setCategory] = useState<string>('COBRANCA_INDEVIDA');
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>(
    ride?.passengerName || localStorage.getItem('vaicar_passenger_name') || 'Passageiro',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'COBRANCA_INDEVIDA', label: 'Cobrança diferente do combinado' },
    { value: 'CONDUTA_INADEQUADA', label: 'Conduta inadequada ou desrespeito' },
    { value: 'CANCELAMENTO_EXCESSIVO', label: 'Cancelamento recorrente injustificado' },
    { value: 'VEICULO_DIFERENTE', label: 'Veículo ou placa diferente da cadastrada' },
    { value: 'DIRECAO_PERIGOSA', label: 'Direção perigosa ou imprudente' },
    { value: 'OUTROS', label: 'Outro problema' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor descreva o ocorrido.');
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

      alert('Denúncia registrada com sucesso. A equipe administrativa de São Sebastião avaliará o caso.');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar denúncia');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-xl font-black text-white">Denunciar Problema</h2>
          </div>
          <p className="text-xs text-slate-400">
            {ride ? `Ocorrência referente à corrida com ${ride.driverName}` : 'Canal de moderação e integridade VaiCar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Motivo Principal</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Seu Nome</label>
            <input
              type="text"
              required
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Descreva detalhadamente o ocorrido
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que aconteceu de forma objetiva para a auditoria..."
              className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 text-xs outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando relato...' : 'ENVIAR DENÚNCIA PARA MODERAÇÃO'}
          </button>
        </form>
      </div>
    </div>
  );
};
