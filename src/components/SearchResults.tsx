import React, { useState } from 'react';
import {
  Star,
  Users,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Car,
  MapPin,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';
import { SearchDriversResponse, Zone } from '../types.ts';

interface SearchResultsProps {
  searchData: SearchDriversResponse;
  passengerCount: number;
  originZone: Zone;
  destinationZone: Zone;
  onBackToSearch: () => void;
  onSelectDriver: (driverResult: SearchDriversResponse['results'][0]) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchData,
  passengerCount,
  originZone,
  destinationZone,
  onBackToSearch,
  onSelectDriver,
}) => {
  const [sortBy, setSortBy] = useState<'PRICE_ASC' | 'TIME_ASC' | 'RATING_DESC'>('PRICE_ASC');

  const sortedResults = [...searchData.results].sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.fare - b.fare;
    if (sortBy === 'TIME_ASC') return a.arrivalTimeMin - b.arrivalTimeMin;
    if (sortBy === 'RATING_DESC') return b.ratingAverage - a.ratingAverage;
    return 0;
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Route Summary & Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSearch}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Alterar busca"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white flex-wrap">
              <span className="text-emerald-400">📍 {originZone.name}</span>
              <span className="text-slate-500">➔</span>
              <span className="text-cyan-400">🏁 {destinationZone.name}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distância aprox. {searchData.distanceKm} km • Duração estimada ~{searchData.estimatedDurationMin} min • {passengerCount} {passengerCount === 1 ? 'passageiro' : 'passageiros'}
            </p>
          </div>
        </div>

        {/* Sort Filter Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSortBy('PRICE_ASC')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              sortBy === 'PRICE_ASC' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Menor preço
          </button>
          <button
            onClick={() => setSortBy('TIME_ASC')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              sortBy === 'TIME_ASC' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mais rápido
          </button>
          <button
            onClick={() => setSortBy('RATING_DESC')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              sortBy === 'RATING_DESC' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Melhor avaliação
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>Motoristas disponíveis</span>
            <span className="text-xs bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
              {sortedResults.length} encontrados
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Motoristas credenciados com alvará e seguro regular em São Sebastião
          </p>
        </div>
      </div>

      {/* Results List */}
      {sortedResults.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <Car className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nenhum motorista online nesta rota no momento</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nossos motoristas são profissionais credenciados que atendem por escala e zonas específicas em São Sebastião. Tente uma localidade próxima ou agende com antecedência.
            </p>
          </div>
          <button
            onClick={onBackToSearch}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Modificar Busca
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedResults.map((driver) => (
            <div
              key={driver.driverId}
              className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 sm:p-6 transition-all shadow-lg hover:shadow-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
            >
              {/* Driver and Car Info */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={driver.avatarUrl}
                    alt={driver.name}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full border-2 border-slate-900 shadow">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-white text-base sm:text-lg">{driver.name}</h3>
                    <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg text-xs font-bold text-amber-300">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{driver.ratingAverage.toFixed(1)}</span>
                      <span className="text-slate-400 text-[10px]">({driver.ratingCount})</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-medium">
                    <span className="text-white font-bold">{driver.vehicle.brand} {driver.vehicle.model}</span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="text-slate-400">{driver.vehicle.color}</span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="text-emerald-400 font-semibold">{driver.vehicle.category}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Até {driver.vehicle.capacity} passageiros
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      ~{driver.arrivalTimeMin} min de distância
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">{driver.ridesCompleted} viagens concluídas</span>
                  </div>
                </div>
              </div>

              {/* Price & Action CTA */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Preço da corrida
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-emerald-400">R$</span>
                    <span className="text-3xl font-black text-white tracking-tight">{driver.fare}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {driver.pricingType === 'FIXED_ROUTE' ? 'Tarifa fixa de rota' : 'Calculado por km'} • Sem taxas extras
                  </span>
                </div>

                <button
                  id={`request-driver-${driver.driverId}`}
                  onClick={() => onSelectDriver(driver)}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>SOLICITAR CORRIDA</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clarification Box */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          O valor informado é o preço total da corrida definido pelo motorista conforme suas regras tarifárias.
          O pagamento é realizado diretamente entre passageiro e motorista (Pix, Dinheiro ou Cartão a combinar).
          A plataforma não retém comissão sobre as corridas dos motoristas.
        </p>
      </div>
    </div>
  );
};
