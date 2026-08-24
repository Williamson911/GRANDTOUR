import { LeaderOption } from './card';
import { Match } from './match';

export interface PlayerResult {
  id: string;
  eventId: string;
  deckName: string;
  leaderCard: LeaderOption;
  placement: number;
  totalPlayers: number;
  prizes: number;
  notes?: string;
  matches: Match[];
  createdAt: number;
  updatedAt: number;
}
