import { Match } from './match';

export interface PlayerResult {
  id: string;
  eventId: string;
  deckName: string;
  leaderPlayed: string;
  placement: number;
  totalPlayers: number;
  prizes: number;
  notes?: string;
  matches: Match[];
  createdAt: number;
  updatedAt: number;
}
