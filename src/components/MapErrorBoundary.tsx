import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Compass } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[MapErrorBoundary] Caught error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[350px] bg-slate-950/95 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-300 relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #10B981 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              Ativação Necessária: Maps JavaScript API
            </h3>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Sua chave de API foi configurada com sucesso, mas a <strong>Maps JavaScript API</strong> precisa ser habilitada no console do seu projeto Google Cloud.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <a
                href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <span>1. Ativar Maps JS API</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://console.cloud.google.com/apis/library/places.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <span>2. Ativar Places API</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-[11px] text-emerald-400/90 font-medium">
              💡 Dica: Todas as funções de cálculo de corrida, busca de bairros e solicitação continuam funcionando normalmente através do painel ao lado.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

