import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, ArrowLeft, Navigation, Flag, Compass, Clock } from 'lucide-react';
import { Zone } from '../types.ts';
import { searchPlaces, PlaceSearchResult } from '../lib/api.ts';

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder?: string;
  type: 'ORIGIN' | 'DESTINATION';
  zones: Zone[];
  onSelectPlace: (place: {
    title: string;
    subtitle: string;
    formattedAddress?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    lat: number;
    lng: number;
    placeId?: string;
  }) => void;
  onUseGps?: () => void;
  isLocatingUser?: boolean;
}

export const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  title,
  placeholder = 'Digite praia, rua, bairro ou hotel...',
  type,
  zones,
  onSelectPlace,
  onUseGps,
  isLocatingUser = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const places = await searchPlaces(query);
        setResults(places);
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Key popular local landmarks in São Sebastião
  const popularSpots = [
    { title: 'Centro Histórico', subtitle: 'Rua da Praia, Comércio & Centro', lat: -23.8078, lng: -45.4058 },
    { title: 'Praia de Maresias', subtitle: 'Av. Dr. Francisco Loup • Costa Sul', lat: -23.7915, lng: -45.5684 },
    { title: 'Praia de Juquehy', subtitle: 'Av. Mãe Bernarda • Costa Sul', lat: -23.766, lng: -45.727 },
    { title: 'Praia de Boiçucanga', subtitle: 'Comércio, Pôr do Sol • Costa Sul', lat: -23.782, lng: -45.617 },
    { title: 'Praia de Camburi', subtitle: 'Pousadas e Gastronomia • Costa Sul', lat: -23.7745, lng: -45.642 },
    { title: 'Praia de Barequeçaba', subtitle: 'Mar Calmo • Costa Central/Sul', lat: -23.834, lng: -45.438 },
    { title: 'Terminal da Balsa (Ilhabela)', subtitle: 'Av. Antônio Januário do Amaral', lat: -23.8115, lng: -45.4012 },
    { title: 'Hospital de São Sebastião', subtitle: 'Rua Cap. Luiz Soares • Centro', lat: -23.8045, lng: -45.4035 },
    { title: 'Terminal Rodoviário', subtitle: 'Praça João Eduardo de Moraes', lat: -23.809, lng: -45.404 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {type === 'ORIGIN' ? (
                <MapPin className="w-5 h-5 text-emerald-400" />
              ) : (
                <Flag className="w-5 h-5 text-sky-400" />
              )}
              <span>{title}</span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-emerald-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Option: Use GPS (Only for Origin) */}
          {type === 'ORIGIN' && onUseGps && (
            <button
              type="button"
              onClick={() => {
                onUseGps();
                onClose();
              }}
              disabled={isLocatingUser}
              className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-2xl text-left flex items-center gap-3 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                <Navigation className={`w-5 h-5 ${isLocatingUser ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-emerald-400 block">
                  {isLocatingUser ? 'Obtendo sinal GPS...' : 'Usar minha localização atual'}
                </span>
                <span className="text-[11px] text-slate-400 truncate block">
                  Identificar onde você está via satélites GPS
                </span>
              </div>
            </button>
          )}

          {/* Results list */}
          {isLoading ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Buscando endereços em São Sebastião...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 block">
                Resultados Encontrados ({results.length})
              </span>
              {results.map((item, idx) => (
                <button
                  key={`search-res-${idx}-${item.lat}-${item.lng}`}
                  type="button"
                  onClick={() => {
                    onSelectPlace({
                      title: item.title,
                      subtitle: item.subtitle,
                      formattedAddress: item.formattedAddress,
                      street: item.street,
                      number: item.number,
                      neighborhood: item.neighborhood,
                      city: item.city,
                      state: item.state,
                      lat: item.lat,
                      lng: item.lng,
                      placeId: item.placeId,
                    });
                    onClose();
                  }}
                  className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800/90 hover:border-emerald-500/50 p-3.5 rounded-2xl text-left flex items-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700 group-hover:border-emerald-500/40 transition-colors">
                    {item.isZone ? <Compass className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 block truncate transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-12 space-y-1">
              <p className="text-sm font-bold text-slate-300">Nenhum local encontrado para "{query}"</p>
              <p className="text-xs text-slate-500">Tente buscar pelo nome da praia, rua ou ponto de referência.</p>
            </div>
          ) : (
            /* Popular spots when no search typed */
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 block">
                Destinos & Locais Populares em São Sebastião
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {popularSpots.map((spot, idx) => (
                  <button
                    key={`popular-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectPlace({
                        title: spot.title,
                        subtitle: spot.subtitle,
                        lat: spot.lat,
                        lng: spot.lng,
                      });
                      onClose();
                    }}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/40 p-3 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center shrink-0 border border-slate-800 group-hover:text-emerald-400 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white block truncate">
                        {spot.title}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {spot.subtitle}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
