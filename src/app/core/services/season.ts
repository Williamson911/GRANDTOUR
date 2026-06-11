import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';
import { AuthService } from './auth';

interface PlayerResultRow extends PlayerResult {
  userId: string;
}

const URL = `${API_BASE_URL}/results`;

type ResultMap = Record<string, PlayerResultRow>;

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _results = signal<ResultMap>({});

  readonly results = computed<Record<string, PlayerResult>>(() => {
    const out: Record<string, PlayerResult> = {};
    for (const [eventId, row] of Object.entries(this._results())) {
      const { userId: _u, ...rest } = row;
      out[eventId] = rest;
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
      try {
        const rows = await firstValueFrom(
          this.http.get<PlayerResultRow[]>(URL, { params: { userId } }),
        );
        const map: ResultMap = {};
        for (const r of rows) map[r.eventId] = r;
        this._results.set(map);
      } catch (err) {
        console.error('results load failed', err);
        this._results.set({});
      }
    });
  }

  forEvent(eventId: string): PlayerResult | undefined {
    const row = this._results()[eventId];
    if (!row) return undefined;
    const { userId: _u, ...rest } = row;
    return rest;
  }

  async upsertResult(
    eventId: string,
    patch: {
      deckName: string;
      leaderPlayed: string;
      placement: number;
      totalPlayers: number;
      prizes: number;
      notes?: string;
    },
  ): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const now = Date.now();
    const current = this._results()[eventId];

    if (current) {
      const next: PlayerResultRow = { ...current, ...patch, updatedAt: now };
      this._results.update((map) => ({ ...map, [eventId]: next }));
      try {
        await firstValueFrom(this.http.patch(`${URL}/${current.id}`, { ...patch, updatedAt: now }));
      } catch (err) {
        console.error('result update failed', err);
      }
    } else {
      const draft = {
        userId,
        eventId,
        matches: [] as PlayerResultRow['matches'],
        createdAt: now,
        updatedAt: now,
        ...patch,
      };
      try {
        const created = await firstValueFrom(
          this.http.post<PlayerResultRow>(URL, draft),
        );
        this._results.update((map) => ({ ...map, [eventId]: created }));
      } catch (err) {
        console.error('result create failed', err);
      }
    }
  }

  async deleteResult(eventId: string): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const current = this._results()[eventId];
    if (!current) return;
    this._results.update((map) => {
      const next = { ...map };
      delete next[eventId];
      return next;
    });
    try {
      await firstValueFrom(this.http.delete(`${URL}/${current.id}`));
    } catch (err) {
      console.error('result delete failed', err);
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
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const current = this._results()[eventId];
    if (!current) return;
    const round = current.matches.length + 1;
    const match: Match = {
      round,
      opponentLeader: input.opponentLeader,
      result: input.result,
      ...(input.opponentName ? { opponentName: input.opponentName } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    const next: PlayerResultRow = {
      ...current,
      matches: [...current.matches, match],
      updatedAt: Date.now(),
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    try {
      await firstValueFrom(
        this.http.patch(`${URL}/${current.id}`, {
          matches: next.matches,
          updatedAt: next.updatedAt,
        }),
      );
    } catch (err) {
      console.error('match add failed', err);
    }
  }

  async deleteMatch(eventId: string, round: number): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const current = this._results()[eventId];
    if (!current) return;
    const next: PlayerResultRow = {
      ...current,
      matches: current.matches
        .filter((m) => m.round !== round)
        .map((m, idx) => ({ ...m, round: idx + 1 })),
      updatedAt: Date.now(),
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    try {
      await firstValueFrom(
        this.http.patch(`${URL}/${current.id}`, {
          matches: next.matches,
          updatedAt: next.updatedAt,
        }),
      );
    } catch (err) {
      console.error('match delete failed', err);
    }
  }
}
