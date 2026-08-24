import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';
import { AuthService } from './auth';
import { CardResponse, toLeaderOption } from './cards';

interface ResultsResponse {
  id: string;
  userId: string;
  eventId: string;
  deckName: string;
  leaderCard: CardResponse;
  placement: number;
  totalPlayers: number;
  prizes: number;
  notes: string | null;
  matches: Match[];
  createdAt: string;
  updatedAt: string;
}

type ResultMap = Record<string, ResultsResponse>;

function toResult(row: ResultsResponse): PlayerResult {
  return {
    id: row.id,
    eventId: row.eventId,
    deckName: row.deckName,
    leaderCard: toLeaderOption(row.leaderCard),
    placement: row.placement,
    totalPlayers: row.totalPlayers,
    prizes: row.prizes,
    ...(row.notes ? { notes: row.notes } : {}),
    matches: row.matches ?? [],
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
  };
}

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _results = signal<ResultMap>({});

  readonly results = computed<Record<string, PlayerResult>>(() => {
    const out: Record<string, PlayerResult> = {};
    for (const [eventId, row] of Object.entries(this._results())) {
      out[eventId] = toResult(row);
    }
    return out;
  });
  readonly allResults: Signal<PlayerResult[]> = computed(() =>
    Object.values(this.results()),
  );

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this._results.set({});
        return;
      }
      await this.reload();
    });
  }

  private async reload(): Promise<void> {
    try {
      const rows = await firstValueFrom(
        this.http.get<ResultsResponse[]>(`${environment.apiUrl}/results/me`),
      );
      const map: ResultMap = {};
      for (const r of rows) map[r.eventId] = r;
      this._results.set(map);
    } catch (error) {
      console.error('results load failed', error);
      this._results.set({});
    }
  }

  forEvent(eventId: string): PlayerResult | undefined {
    const row = this._results()[eventId];
    return row ? toResult(row) : undefined;
  }

  async upsertResult(
    eventId: string,
    patch: {
      deckName: string;
      leaderCardId: string;
      placement: number;
      totalPlayers: number;
      prizes: number;
      notes?: string;
    },
  ): Promise<void> {
    if (!this.auth.currentUserId()) return;
    const matches = this._results()[eventId]?.matches ?? [];
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/results/${eventId}`, {
          deckName: patch.deckName,
          leaderCardId: patch.leaderCardId,
          placement: patch.placement,
          totalPlayers: patch.totalPlayers,
          prizes: patch.prizes,
          notes: patch.notes ?? null,
          matches,
        }),
      );
      await this.reload();
    } catch (error) {
      console.error('result upsert failed', error);
    }
  }

  async deleteResult(eventId: string): Promise<void> {
    if (!this.auth.currentUserId()) return;
    if (!this._results()[eventId]) return;
    this._results.update((map) => {
      const next = { ...map };
      delete next[eventId];
      return next;
    });
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/results/${eventId}`),
      );
    } catch (error) {
      console.error('result delete failed', error);
    }
  }

  async addMatch(
    eventId: string,
    input: {
      opponentLeader: string;
      result: Match['result'];
      opponentName?: string;
      notes?: string;
    },
  ): Promise<void> {
    if (!this.auth.currentUserId()) return;
    const current = this._results()[eventId];
    if (!current) return;
    const round = (current.matches ?? []).length + 1;
    const match: Match = {
      round,
      opponentLeader: input.opponentLeader,
      result: input.result,
      ...(input.opponentName ? { opponentName: input.opponentName } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    const nextMatches = [...(current.matches ?? []), match];
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/results/${eventId}`, {
          deckName: current.deckName,
          leaderCardId: current.leaderCard.id,
          placement: current.placement,
          totalPlayers: current.totalPlayers,
          prizes: current.prizes,
          notes: current.notes,
          matches: nextMatches,
        }),
      );
      await this.reload();
    } catch (error) {
      console.error('match add failed', error);
    }
  }

  async updateMatch(
    eventId: string,
    round: number,
    input: {
      opponentLeader: string;
      result: Match['result'];
      opponentName?: string;
      notes?: string;
    },
  ): Promise<void> {
    if (!this.auth.currentUserId()) return;
    const current = this._results()[eventId];
    if (!current) return;
    const nextMatches = (current.matches ?? []).map((m) =>
      m.round === round
        ? {
            round,
            opponentLeader: input.opponentLeader,
            result: input.result,
            ...(input.opponentName ? { opponentName: input.opponentName } : {}),
            ...(input.notes ? { notes: input.notes } : {}),
          }
        : m,
    );
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/results/${eventId}`, {
          deckName: current.deckName,
          leaderCardId: current.leaderCard.id,
          placement: current.placement,
          totalPlayers: current.totalPlayers,
          prizes: current.prizes,
          notes: current.notes,
          matches: nextMatches,
        }),
      );
      await this.reload();
    } catch (error) {
      console.error('match update failed', error);
    }
  }

  async deleteMatch(eventId: string, round: number): Promise<void> {
    if (!this.auth.currentUserId()) return;
    const current = this._results()[eventId];
    if (!current) return;
    const nextMatches = (current.matches ?? [])
      .filter((m) => m.round !== round)
      .map((m, idx) => ({ ...m, round: idx + 1 }));
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/results/${eventId}`, {
          deckName: current.deckName,
          leaderCardId: current.leaderCard.id,
          placement: current.placement,
          totalPlayers: current.totalPlayers,
          prizes: current.prizes,
          notes: current.notes,
          matches: nextMatches,
        }),
      );
      await this.reload();
    } catch (error) {
      console.error('match delete failed', error);
    }
  }
}
