import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, ArrowLeft, Award, Clock, Sparkles } from 'lucide-react';
import { Driver, SubscriptionPlan, VAICAR_SUBSCRIPTION_TIERS, getDriverFeeFromIndex } from '../types.ts';

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

  const regIndex = driver.registrationIndex && driver.registrationIndex > 0 ? driver.registrationIndex : 1;
  const tierInfo = getDriverFeeFromIndex(regIndex);
  const activeFee = typeof driver.monthlyFeeBrl === 'number' ? driver.monthlyFeeBrl : tierInfo.fee;
  const isFreePlan = activeFee === 0;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const updated: Driver = {
        ...driver,
        subscriptionStatus: 'ACTIVE',
        monthlyFeeBrl: activeFee,
        registrationIndex: regIndex,
      };
      onRefreshDriver(updated);
      setIsProcessing(false);
      alert(
        isFreePlan
          ? '🎉 Parabéns! Sua isenção de R$ 0/mês como 1º motorista registrado está ativa. 0% de comissão garantido!'
          : `Plano VaiCar Pro ativado com sucesso por R$ ${activeFee}/mês! 0% de comissão garantido.`
      );
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
        <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Mensalidade Escalonada VaiCar
          </span>
        </div>
        <h1 className="text-3xl font-black text-white">Seu Plano de Mensalidade</h1>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          Você não divide seus ganhos. Fique com 100% do valor de todas as corridas que realizar.
        </p>
      </div>

      {/* Driver Registration Badge Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
            #{regIndex}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Registro de Motorista</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                Posição #{regIndex}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isFreePlan
                ? '🏆 Você é o 1º motorista registrado: Isenção total da mensalidade!'
                : `Enquadrado no lote: ${tierInfo.tierLabel}`}
            </p>
          </div>
        </div>
        <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Sua Mensalidade</span>
          <span className="text-lg font-black text-emerald-400">
            {isFreePlan ? 'R$ 0 / mês (Grátis)' : `R$ ${activeFee} / mês`}
          </span>
        </div>
      </div>

      {/* Main Pricing Pro Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-2 border-emerald-500/60 rounded-3xl p-7 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              {plan.name || 'VaiCar Pro'}
            </span>
            <h3 className="text-2xl font-black text-white mt-0.5">Assinatura Profissional</h3>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-emerald-400">R$</span>
              <span className="text-4xl font-black text-white">{activeFee}</span>
              <span className="text-xs text-slate-400">/mês</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-bold block">
              0% de comissão sobre corridas
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

        {/* Tiered Table Transparency Breakdown */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Estrutura Oficial de Mensalidades da Plataforma:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {VAICAR_SUBSCRIPTION_TIERS.map((tier, idx) => {
              const isCurrentTier =
                (idx === 0 && regIndex === 1) ||
                (idx === 1 && regIndex >= 2 && regIndex <= 10) ||
                (idx === 2 && regIndex >= 11 && regIndex <= 20) ||
                (idx === 3 && regIndex >= 21);

              return (
                <div
                  key={tier.range}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isCurrentTier
                      ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200">{tier.range}</span>
                    <span
                      className={`font-black text-xs ${
                        isCurrentTier ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{tier.description}</p>
                  {isCurrentTier && (
                    <span className="inline-block mt-1.5 text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                      ✓ Seu Nível Atual
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro features list */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Vantagens incluídas no seu plano:
          </span>
          {[
            'Receba solicitações ilimitadas de passageiros locais e turistas',
            'Perfil profissional verificado com foto e veículo',
            'Cadastro e vistoria de veículo autorizada',
            'Defina seus próprios preços (rotas fixas e/ou preço por km)',
            'Defina sua área de atendimento e adicione zonas personalizadas',
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
                : isFreePlan
                ? 'ATIVAR BENEFÍCIO GRATUITO (R$ 0/MÊS)'
                : driver.subscriptionStatus === 'ACTIVE'
                ? `RENOVAR PLANO PRO (R$ ${activeFee}/MÊS)`
                : `ASSINAR VAICAR PRO (R$ ${activeFee}/MÊS)`}
            </span>
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Estrutura escalonada da VaiCar: R$ 0 para 1º registro, R$ 60 (2º ao 10º), R$ 80 (11º ao 20º) e R$ 100 (21º ao 100º). 0% de comissão por corrida.
          </p>
        </div>
      </div>
    </div>
  );
};
