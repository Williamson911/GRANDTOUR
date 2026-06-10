import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';
import { AuthService } from './auth';

const KEY_PREFIX = 'grandtour.results.v1.';

type ResultMap = Record<string, PlayerResult>;

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly auth = inject(AuthService);
  private readonly _results = signal<ResultMap>({});

  readonly results: Signal<ResultMap> = this._results.asReadonly();
  readonly allResults = computed(() => Object.values(this._results()));

  constructor() {
    effect(() => {
      const userId = this.auth.currentUserId();
      this._results.set(this.read(userId));
    });
  }

  forEvent(eventId: string): PlayerResult | undefined {
    return this._results()[eventId];
  }

  upsertResult(
    eventId: string,
    patch: {
      deckName: string;
      leaderPlayed: string;
      placement: number;
      totalPlayers: number;
      prizes: number;
      notes?: string;
    },
  ): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const now = Date.now();
    const current = this._results()[eventId];
    const next: PlayerResult = current
      ? { ...current, ...patch, updatedAt: now }
      : {
          id: crypto.randomUUID(),
          eventId,
          matches: [],
          createdAt: now,
          updatedAt: now,
          ...patch,
        };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    this.persist(userId);
  }

  deleteResult(eventId: string): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    this._results.update((map) => {
      const next = { ...map };
      delete next[eventId];
      return next;
    });
    this.persist(userId);
  }

  addMatch(
    eventId: string,
    input: { opponentLeader: string; result: Match['result']; opponentName?: string; notes?: string },
  ): void {
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
    const next: PlayerResult = {
      ...current,
      matches: [...current.matches, match],
      updatedAt: Date.now(),
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    this.persist(userId);
  }

  deleteMatch(eventId: string, round: number): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const current = this._results()[eventId];
    if (!current) return;
    const next: PlayerResult = {
      ...current,
      matches: current.matches
        .filter((m) => m.round !== round)
        .map((m, idx) => ({ ...m, round: idx + 1 })),
      updatedAt: Date.now(),
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    this.persist(userId);
  }

  private read(userId: string | null): ResultMap {
    if (!userId) return {};
    try {
      const raw = localStorage.getItem(KEY_PREFIX + userId);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed ? (parsed as ResultMap) : {};
    } catch {
      return {};
    }
  }

  private persist(userId: string): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(this._results()));
    } catch {
      /* ignore */
    }
  }
}
