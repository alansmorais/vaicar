import React, { Component, ErrorInfo, ReactNode } from 'react';

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
      return this.props.fallback || (
        <div className="w-full h-full min-h-[300px] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <p className="text-sm font-bold text-white mb-1">Navegação Local Ativa</p>
          <p className="text-xs text-slate-400 max-w-md">
            A visualização padrão do mapa está ativa. Para carregar o Google Maps completo, ative a "Maps JavaScript API" no console do Google Cloud.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
