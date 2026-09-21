import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, ArrowLeft, Award, Clock } from 'lucide-react';
import { Driver, SubscriptionPlan } from '../types.ts';

interface DriverSubscriptionProps {
  driver: Driver;
  plan: SubscriptionPlan;
  onBackToCockpit: () => void;
  onRefreshDriver: (updated: Driver) => void;
}

export const DriverSubscription: React.FC<DriverSubscriptionProps> = ({
  driver,
  plan,
  onBackToCockpit,
  onRefreshDriver,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      driver.subscriptionStatus = 'ACTIVE';
      onRefreshDriver({ ...driver });
      setIsProcessing(false);
      alert('Plano VaiCar Pro ativado com sucesso! 0% de comissão garantido.');
    }, 600);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={onBackToCockpit}
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao painel do motorista</span>
      </button>

      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
          Mensalidade Plataforma
        </span>
        <h1 className="text-3xl font-black text-white">Seu plano VaiCar</h1>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          Você não divide seus ganhos. Fique com 100% do valor de todas as corridas que realizar.
        </p>
      </div>

      {/* Main Pricing Pro Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-2 border-emerald-500/60 rounded-3xl p-7 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              {plan.name}
            </span>
            <h3 className="text-2xl font-black text-white mt-0.5">Assinatura Profissional</h3>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-emerald-400">R$</span>
              <span className="text-4xl font-black text-white">{plan.priceBrl}</span>
              <span className="text-xs text-slate-400">/mês</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold block">
              0% de comissão por corrida
            </span>
          </div>
        </div>

        {/* Current status pill */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Status atual da sua conta:</span>
          <span
            className={`font-black px-2.5 py-1 rounded-lg uppercase text-[11px] ${
              driver.subscriptionStatus === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {driver.subscriptionStatus === 'ACTIVE'
              ? '🟢 Assinatura Ativa'
              : '🟡 Período de Teste (Trial)'}
          </span>
        </div>

        {/* Pro features list per spec #11 */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Vantagens incluídas no seu plano:
          </span>
          {[
            'Receba solicitações ilimitadas de passageiros locais e turistas',
            'Perfil profissional verificado com foto e veículo',
            'Cadastro e vistoria de veículo autorizada',
            'Defina seus próprios preços (rotas fixas e/ou preço por km)',
            'Defina sua área de atendimento em São Sebastião',
            'Receba chamadas diretas com link de WhatsApp',
            'Histórico de viagens, avaliações e estatísticas',
            '0% de comissão sobre corridas — todo o dinheiro fica com você',
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>
              {isProcessing
                ? 'Processando assinatura...'
                : driver.subscriptionStatus === 'ACTIVE'
                ? 'RENOVAR PLANO PRO (R$ 49/MÊS)'
                : 'ASSINAR VAICAR PRO AGORA'}
            </span>
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Valor parametrizado pelo painel administrativo da plataforma. Cancelamento a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
};
