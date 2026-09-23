import { SavedCard } from '../types.ts';

const STORAGE_KEY = 'vaicar_saved_cards';

export const INITIAL_SAVED_CARDS: SavedCard[] = [
  {
    id: 'card-default-1',
    holderName: 'Camila Rocha',
    cardNumber: '•••• •••• •••• 4242',
    last4: '4242',
    brand: 'mastercard',
    expiryMonth: '11',
    expiryYear: '29',
    type: 'CREDIT',
    nickname: 'Nubank Roxinho (Crédito)',
    isDefault: true,
  },
  {
    id: 'card-default-2',
    holderName: 'Camila Rocha',
    cardNumber: '•••• •••• •••• 8831',
    last4: '8831',
    brand: 'visa',
    expiryMonth: '08',
    expiryYear: '28',
    type: 'DEBIT',
    nickname: 'Itaú Débito da Conta',
    isDefault: false,
  },
];

export function getSavedCards(): SavedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAVED_CARDS));
      return INITIAL_SAVED_CARDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SAVED_CARDS;
  }
}

export function detectCardBrand(cardNumber: string): 'mastercard' | 'visa' | 'elo' | 'hipercard' | 'amex' {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard';
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|6504|6505|6516)/.test(clean)) return 'elo';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  return 'mastercard';
}

export function saveNewCard(params: {
  holderName: string;
  cardNumber: string;
  expiry: string; // MM/YY
  cvv: string;
  type: 'CREDIT' | 'DEBIT';
  nickname?: string;
}): SavedCard {
  const cards = getSavedCards();
  const cleanNumber = params.cardNumber.replace(/\D/g, '');
  const last4 = cleanNumber.slice(-4) || '1234';
  const brand = detectCardBrand(cleanNumber);
  const [month, year] = params.expiry.split('/');

  const newCard: SavedCard = {
    id: `card-${Date.now()}`,
    holderName: params.holderName.toUpperCase().trim(),
    cardNumber: `•••• •••• •••• ${last4}`,
    last4,
    brand,
    expiryMonth: month?.trim() || '12',
    expiryYear: year?.trim() || '29',
    type: params.type,
    nickname: params.nickname?.trim() || (params.type === 'CREDIT' ? 'Cartão de Crédito' : 'Cartão de Débito'),
    isDefault: cards.length === 0,
  };

  const updated = [newCard, ...cards];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newCard;
}

export function removeCard(cardId: string): SavedCard[] {
  const cards = getSavedCards().filter((c) => c.id !== cardId);
  if (cards.length > 0 && !cards.some((c) => c.isDefault)) {
    cards[0].isDefault = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  return cards;
}

export function setDefaultCard(cardId: string): SavedCard[] {
  const cards = getSavedCards().map((c) => ({
    ...c,
    isDefault: c.id === cardId,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  return cards;
}
