export interface LeaderOption {
  id: string;
  name: string;
  backName: string | null;
  cardNumber: string;
  imgLink: string | null;
  cardType: string;
  cardRarity: string | null;
}

export function leaderDisplayName(option: LeaderOption, preferAwakened = true): string {
  if (!option.backName) return option.name;
  return preferAwakened ? option.backName : option.name;
}
