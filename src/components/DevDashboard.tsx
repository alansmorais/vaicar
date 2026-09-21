import React, { useState } from 'react';
import {
  Code2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Terminal,
  RefreshCw,
  Play,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Driver, Ride, PlatformMetrics, SubscriptionPlan } from '../types.ts';

interface DevDashboardProps {
  metrics: PlatformMetrics;
  drivers: Driver[];
  rides: Ride[];
  plan: SubscriptionPlan;
  onLoadDemo: (approved?: boolean) => void;
  onResetData: () => void;
  onToggleDemoApproval: () => void;
  onRefreshAll: () => void;
}

export const DevDashboard: React.FC<DevDashboardProps> = ({
  metrics,
  drivers,
  rides,
  plan,
  onLoadDemo,
  onResetData,
  onToggleDemoApproval,
  onRefreshAll,
}) => {
  const [selectedInspectTab, setSelectedInspectTab] = useState<'METRICS' | 'DRIVERS' | 'RIDES' | 'RAW'>('METRICS');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  const demoDriver = drivers.find((d) => d.id === 'drv-demo-joao');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Dev Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Painel do Desenvolvedor & Auditoria
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  MODO DE TESTE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ferramentas para validação de fluxos, injeção de dados DEMO controlados e reset de estado.
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshAll}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Estado</span>
          </button>
        </div>

        {/* Notice strictly about no fake data */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1 text-slate-300">
          <p className="font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Política Rigorosa de Dados Reais & Teste Controlado:
          </p>
          <p className="text-[11px] text-slate-400">
            A plataforma não utiliza dados falsos ou simuladores externos. Quando não houver cadastros, o sistema exibe o estado vazio correspondente. Apenas contas claramente identificadas como <strong>DEMO / EXEMPLO</strong> são utilizadas para validação técnica de ponta a ponta.
          </p>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Button 1: Load Demo Driver Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>1. Injetar DEMO (Pendente)</span>
          </div>
          <p className="text-xs text-slate-400">
            Carrega João da Silva com status <strong>PENDING</strong> para testar a auditoria municipal de documentos no Painel Admin.
          </p>
          <button
            onClick={() => {
              onLoadDemo(false);
              setTestResultMsg('Motorista DEMO carregado com status PENDENTE!');
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer border border-slate-700 transition-colors"
          >
            Carregar DEMO Pendente
          </button>
        </div>

        {/* Button 2: Load Demo Driver Approved */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>2. Injetar DEMO (Aprovado)</span>
          </div>
          <p className="text-xs text-slate-400">
            Carrega João da Silva com status <strong>APPROVED</strong> e online para testar busca de viagens e pagamento Pix pelo passageiro.
          </p>
          <button
            onClick={() => {
              onLoadDemo(true);
              setTestResultMsg('Motorista DEMO carregado e APROVADO!');
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer transition-colors shadow-md"
          >
            Carregar DEMO Aprovado
          </button>
        </div>

        {/* Button 3: Reset to zero */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>3. Reset Total (0 Dados)</span>
          </div>
          <p className="text-xs text-slate-400">
            Limpa todos os arrays em memória (motoristas, passageiros, corridas, custos) para testar os estados vazios.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Deseja resetar todos os dados para zero?')) {
                onResetData();
                setTestResultMsg('Todos os dados foram resetados para zero!');
              }
            }}
            className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer border border-rose-500/30 transition-colors"
          >
            Zerar Todo o Sistema
          </button>
        </div>
      </div>

      {testResultMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between">
          <span>{testResultMsg}</span>
          <button onClick={() => setTestResultMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* Demo Driver Status Inspector */}
      {demoDriver && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-white text-sm">Conta DEMO Ativa: {demoDriver.name}</h3>
            </div>
            <span className="text-xs font-mono bg-slate-950 px-2 py-0.5 rounded text-emerald-400">
              {demoDriver.regulatoryStatus} • {demoDriver.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            CPF: {demoDriver.cpf} • Placa: {demoDriver.vehicle.licensePlate} ({demoDriver.vehicle.brand} {demoDriver.vehicle.model}) • Chave Pix: {demoDriver.pixKey}
          </p>

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={onToggleDemoApproval}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Alternar Status ({demoDriver.regulatoryStatus === 'APPROVED' ? 'Tornar Pendente' : 'Aprovar Motorista'})
            </button>
          </div>
        </div>
      )}

      {/* State Inspector / Debug Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Inspetor de Estado em Memória (Runtime)
          </h3>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setSelectedInspectTab('METRICS')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'METRICS' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Métricas
            </button>
            <button
              onClick={() => setSelectedInspectTab('DRIVERS')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'DRIVERS' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Motoristas ({drivers.length})
            </button>
            <button
              onClick={() => setSelectedInspectTab('RIDES')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedInspectTab === 'RIDES' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Corridas ({rides.length})
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto">
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
            {selectedInspectTab === 'METRICS' && JSON.stringify(metrics, null, 2)}
            {selectedInspectTab === 'DRIVERS' && JSON.stringify(drivers, null, 2)}
            {selectedInspectTab === 'RIDES' && JSON.stringify(rides, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
