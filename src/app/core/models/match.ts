export type MatchResult = 'Win' | 'Loss' | 'Draw' | 'Bye';

export interface Match {
  round: number;
  opponentLeader: string;
  opponentName?: string;
  result: MatchResult;
  notes?: string;
}
