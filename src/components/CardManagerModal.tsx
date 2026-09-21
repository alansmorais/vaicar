import React, { useState } from 'react';
import { X, CreditCard, Plus, Trash2, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { SavedCard } from '../types.ts';
import { getSavedCards, saveNewCard, removeCard, setDefaultCard, detectCardBrand } from '../lib/cards.ts';

interface CardManagerModalProps {
  onClose: () => void;
  onSelectCard?: (card: SavedCard) => void;
  selectedCardId?: string;
}

export const CardManagerModal: React.FC<CardManagerModalProps> = ({
  onClose,
  onSelectCard,
  selectedCardId,
}) => {
  const [cards, setCards] = useState<SavedCard[]>(getSavedCards());
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardType, setCardType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [nickname, setNickname] = useState('');

  const formatCardNumberInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  };

  const formatExpiryInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.replace(/\D/g, '') || !holderName || !expiry) {
      alert('Preencha os campos do cartão para cadastrar.');
      return;
    }

    const created = saveNewCard({
      cardNumber,
      holderName,
      expiry,
      cvv,
      type: cardType,
      nickname,
    });

    const updatedList = getSavedCards();
    setCards(updatedList);
    setIsAdding(false);

    // Reset form
    setCardNumber('');
    setHolderName('');
    setExpiry('');
    setCvv('');
    setNickname('');

    if (onSelectCard) {
      onSelectCard(created);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este cartão cadastrado?')) {
      const updated = removeCard(id);
      setCards(updated);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = setDefaultCard(id);
    setCards(updated);
  };

  const detectedBrand = detectCardBrand(cardNumber);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative my-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Cartões Cadastrados</h3>
              <p className="text-xs text-slate-400">Cartão de Crédito ou Débito para suas corridas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security badge */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Seus cartões ficam armazenados de forma segura e tokenizada para pagamento direto ao motorista.
          </span>
        </div>

        {!isAdding ? (
          <div className="space-y-4">
            {cards.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Nenhum cartão de crédito ou débito cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => {
                  const isSelected = selectedCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-center gap-3.5 flex-1 cursor-pointer"
                          onClick={() => onSelectCard && onSelectCard(card)}
                        >
                          <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-black text-[10px] tracking-wider uppercase text-slate-200 shadow">
                            {card.brand}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm">{card.nickname || card.brand.toUpperCase()}</h4>
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                                  card.type === 'CREDIT'
                                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-teal-950 text-teal-300 border border-teal-500/30'
                                }`}
                              >
                                {card.type === 'CREDIT' ? 'Crédito' : 'Débito'}
                              </span>
                              {card.isDefault && (
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              •••• {card.last4} • Expira em {card.expiryMonth}/{card.expiryYear}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {onSelectCard && (
                            <button
                              onClick={() => onSelectCard(card)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {isSelected ? 'Selecionado' : 'Usar'}
                            </button>
                          )}
                          {!card.isDefault && (
                            <button
                              onClick={() => handleSetDefault(card.id)}
                              title="Tornar principal"
                              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                            >
                              Padronizar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(card.id)}
                            title="Remover cartão"
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              id="add-new-card-btn"
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>CADASTRAR NOVO CARTÃO (CRÉDITO OU DÉBITO)</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCard} className="space-y-4">
            {/* Visual preview card */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-xl text-white space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                  {cardType === 'CREDIT' ? 'CARTÃO DE CRÉDITO' : 'CARTÃO DE DÉBITO'}
                </span>
                <span className="text-xs font-black uppercase tracking-wider bg-slate-950/60 px-2 py-0.5 rounded border border-slate-700">
                  {detectedBrand.toUpperCase()}
                </span>
              </div>

              <div className="w-9 h-7 rounded bg-amber-400/90 border border-amber-300 shadow-inner flex items-center justify-center text-[8px] font-bold text-slate-900">
                CHIP
              </div>

              <div className="font-mono text-base sm:text-lg tracking-widest text-slate-200">
                {cardNumber ? formatCardNumberInput(cardNumber) : '•••• •••• •••• ••••'}
              </div>

              <div className="flex items-end justify-between text-xs pt-1">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Titular</span>
                  <span className="font-semibold tracking-wide">
                    {holderName ? holderName.toUpperCase() : 'NOME DO TITULAR'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase">Validade</span>
                  <span className="font-semibold font-mono">
                    {expiry ? formatExpiryInput(expiry) : 'MM/AA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Type Switcher: Crédito vs Débito */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">Tipo do Cartão</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCardType('CREDIT')}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    cardType === 'CREDIT'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('DEBIT')}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    cardType === 'DEBIT'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cartão de Débito
                </button>
              </div>
            </div>

            {/* Card Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Número do Cartão</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full bg-slate-950 text-white font-mono px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome impresso no Cartão</label>
                <input
                  type="text"
                  required
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Como está gravado no cartão"
                  className="w-full bg-slate-950 text-white uppercase px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Validade (MM/AA)</label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                    placeholder="12/29"
                    maxLength={5}
                    className="w-full bg-slate-950 text-white font-mono px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Código CVV</label>
                  <input
                    type="password"
                    required
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full bg-slate-950 text-white font-mono px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Apelido do Cartão (Opcional)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Nubank Pessoal, Cartão Inter, etc."
                  className="w-full bg-slate-950 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg transition-all cursor-pointer"
              >
                SALVAR CARTÃO
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
