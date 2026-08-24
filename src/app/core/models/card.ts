export interface LeaderOption {
  id: string;
  name: string;
  backName: string | null;
  cardNumber: string;
  imgLink: string | null;
  cardType: string;
  cardRarity: string | null;
}

export function leaderDisplayName(option: LeaderOption): string {
  return option.backName ? `${option.name} / ${option.backName}` : option.name;
}
