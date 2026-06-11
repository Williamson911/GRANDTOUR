import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';
import { AuthService } from './auth';
import { supabase } from './supabase';

interface PlayerResultRow {
  id: string;
  event_id: string;
  deck_name: string;
  leader_played: string;
  placement: number;
  total_players: number;
  prizes: number;
  notes: string | null;
  matches: Match[];
  created_at: string;
  updated_at: string;
}

type ResultMap = Record<string, PlayerResultRow>;

function toResult(row: PlayerResultRow, eventId: string): PlayerResult {
  return {
    id: row.id,
    eventId,
    deckName: row.deck_name,
    leaderPlayed: row.leader_played,
    placement: row.placement,
    totalPlayers: row.total_players,
    prizes: row.prizes,
    ...(row.notes ? { notes: row.notes } : {}),
    matches: row.matches ?? [],
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly auth = inject(AuthService);
  private readonly _results = signal<ResultMap>({});

  readonly results = computed<Record<string, PlayerResult>>(() => {
    const out: Record<string, PlayerResult> = {};
    for (const [eventId, row] of Object.entries(this._results())) {
      out[eventId] = toResult(row, eventId);
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
      const { data, error } = await supabase
        .from('results')
        .select(
          'id, event_id, deck_name, leader_played, placement, total_players, prizes, notes, matches, created_at, updated_at',
        );
      if (error) {
        console.error('results load failed', error);
        this._results.set({});
        return;
      }
      const rows = (data ?? []) as PlayerResultRow[];
      const map: ResultMap = {};
      for (const r of rows) map[r.event_id] = r;
      this._results.set(map);
    });
  }

  forEvent(eventId: string): PlayerResult | undefined {
    const row = this._results()[eventId];
    return row ? toResult(row, eventId) : undefined;
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
    const current = this._results()[eventId];
    const nowIso = new Date().toISOString();

    if (current) {
      const updatedRow: PlayerResultRow = {
        ...current,
        deck_name: patch.deckName,
        leader_played: patch.leaderPlayed,
        placement: patch.placement,
        total_players: patch.totalPlayers,
        prizes: patch.prizes,
        notes: patch.notes ?? null,
        updated_at: nowIso,
      };
      this._results.update((map) => ({ ...map, [eventId]: updatedRow }));
      const { error } = await supabase
        .from('results')
        .update({
          deck_name: patch.deckName,
          leader_played: patch.leaderPlayed,
          placement: patch.placement,
          total_players: patch.totalPlayers,
          prizes: patch.prizes,
          notes: patch.notes ?? null,
          updated_at: nowIso,
        })
        .eq('id', current.id);
      if (error) console.error('result update failed', error);
    } else {
      const { data, error } = await supabase
        .from('results')
        .insert({
          user_id: userId,
          event_id: eventId,
          deck_name: patch.deckName,
          leader_played: patch.leaderPlayed,
          placement: patch.placement,
          total_players: patch.totalPlayers,
          prizes: patch.prizes,
          notes: patch.notes ?? null,
          matches: [],
        })
        .select(
          'id, event_id, deck_name, leader_played, placement, total_players, prizes, notes, matches, created_at, updated_at',
        )
        .single();
      if (error) {
        console.error('result create failed', error);
        return;
      }
      this._results.update((map) => ({
        ...map,
        [eventId]: data as PlayerResultRow,
      }));
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
    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', current.id);
    if (error) console.error('result delete failed', error);
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
    const round = (current.matches ?? []).length + 1;
    const match: Match = {
      round,
      opponentLeader: input.opponentLeader,
      result: input.result,
      ...(input.opponentName ? { opponentName: input.opponentName } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    const nextMatches = [...(current.matches ?? []), match];
    const nowIso = new Date().toISOString();
    const next: PlayerResultRow = {
      ...current,
      matches: nextMatches,
      updated_at: nowIso,
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    const { error } = await supabase
      .from('results')
      .update({ matches: nextMatches, updated_at: nowIso })
      .eq('id', current.id);
    if (error) console.error('match add failed', error);
  }

  async deleteMatch(eventId: string, round: number): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const current = this._results()[eventId];
    if (!current) return;
    const nextMatches = (current.matches ?? [])
      .filter((m) => m.round !== round)
      .map((m, idx) => ({ ...m, round: idx + 1 }));
    const nowIso = new Date().toISOString();
    const next: PlayerResultRow = {
      ...current,
      matches: nextMatches,
      updated_at: nowIso,
    };
    this._results.update((map) => ({ ...map, [eventId]: next }));
    const { error } = await supabase
      .from('results')
      .update({ matches: nextMatches, updated_at: nowIso })
      .eq('id', current.id);
    if (error) console.error('match delete failed', error);
  }
}
