export interface CardPrinting {
  cardId: string;
  variantId: string | null;
  name: string;
  backName: string | null;
  cardType: string;
  color: string | null;
  cardNumber: string;
  series: string | null;
  rarity: string | null;
  imgLink: string | null;
}

export interface CollectionItem {
  quantity: number;
  price: number;
  card: CardPrinting;
}

export interface CollectionDraft {
  id: string | null;
  name: string;
  items: CollectionItem[];
}

export interface CollectionSummary {
  id: string;
  name: string;
  cardCount: number;
  totalPrice: number;
}

export function printingKey(card: CardPrinting): string {
  return `${card.cardId}:${card.variantId ?? 'base'}`;
}

export function printingDisplayName(card: CardPrinting): string {
  return card.backName ? `${card.name} / ${card.backName}` : card.name;
}
