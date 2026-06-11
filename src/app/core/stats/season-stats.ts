import { Event } from '../models/event';
import { ExpenseCategory, Expense } from '../models/expense';
import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';

export interface MatchRecord {
  w: number;
  l: number;
  d: number;
  b: number;
}

export interface WinRateStats {
  played: number;
  record: MatchRecord;
  winRate: number;
}

export interface DeckStatsRow {
  deckName: string;
  played: number;
  record: MatchRecord;
  winRate: number;
}

export interface MatchupRow {
  opponentLeader: string;
  played: number;
  record: MatchRecord;
  winRate: number;
}

export interface BestPlacement {
  eventId: string;
  eventName: string;
  placement: number;
  totalPlayers: number;
}

export interface CityVisit {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
}

export interface BudgetCategoryRow {
  category: ExpenseCategory;
  amount: number;
  share: number;
}

export interface BudgetEventRow {
  eventId: string;
  eventName: string;
  date: Date;
  spent: number;
  prizes: number;
  net: number;
}

export interface BudgetTotals {
  spent: number;
  prizes: number;
  net: number;
}

function indexEvents(events: Event[]): Map<string, Event> {
  const map = new Map<string, Event>();
  for (const e of events) map.set(e.id, e);
  return map;
}

export function aggregateRecord(matches: Match[]): MatchRecord {
  const rec: MatchRecord = { w: 0, l: 0, d: 0, b: 0 };
  for (const m of matches) {
    if (m.result === 'Win') rec.w++;
    else if (m.result === 'Loss') rec.l++;
    else if (m.result === 'Draw') rec.d++;
    else if (m.result === 'Bye') rec.b++;
  }
  return rec;
}

export function computeWinRate(record: MatchRecord): number {
  const denom = record.w + record.l + record.b + record.d;
  if (denom === 0) return 0;
  return (record.w + record.b + 0.5 * record.d) / denom;
}

function recordPlayed(record: MatchRecord): number {
  return record.w + record.l + record.b + record.d;
}

export function filterResultsByYear(
  results: PlayerResult[],
  events: Event[],
  year: number,
): PlayerResult[] {
  const idx = indexEvents(events);
  return results.filter((r) => {
    const ev = idx.get(r.eventId);
    return ev ? ev.date.getFullYear() === year : false;
  });
}

export function filterExpensesByYear(
  expenses: Expense[],
  events: Event[],
  year: number,
): Expense[] {
  const idx = indexEvents(events);
  return expenses.filter((e) => {
    const ev = idx.get(e.eventId);
    return ev ? ev.date.getFullYear() === year : false;
  });
}

export function globalWinRate(results: PlayerResult[]): WinRateStats {
  const all = results.flatMap((r) => r.matches);
  const record = aggregateRecord(all);
  return {
    played: recordPlayed(record),
    record,
    winRate: computeWinRate(record),
  };
}

export function winRateByDeck(results: PlayerResult[]): DeckStatsRow[] {
  const byDeck = new Map<string, Match[]>();
  for (const r of results) {
    const arr = byDeck.get(r.deckName) ?? [];
    arr.push(...r.matches);
    byDeck.set(r.deckName, arr);
  }
  const rows: DeckStatsRow[] = [];
  for (const [deckName, matches] of byDeck) {
    const record = aggregateRecord(matches);
    rows.push({
      deckName,
      played: recordPlayed(record),
      record,
      winRate: computeWinRate(record),
    });
  }
  return rows.sort(
    (a, b) => b.played - a.played || a.deckName.localeCompare(b.deckName),
  );
}

export function matchupBreakdown(
  results: PlayerResult[],
  deckFilter?: string,
): MatchupRow[] {
  const scope = deckFilter
    ? results.filter((r) => r.leaderPlayed === deckFilter)
    : results;
  const byOpp = new Map<string, Match[]>();
  for (const r of scope) {
    for (const m of r.matches) {
      const arr = byOpp.get(m.opponentLeader) ?? [];
      arr.push(m);
      byOpp.set(m.opponentLeader, arr);
    }
  }
  const rows: MatchupRow[] = [];
  for (const [opponentLeader, matches] of byOpp) {
    const record = aggregateRecord(matches);
    rows.push({
      opponentLeader,
      played: recordPlayed(record),
      record,
      winRate: computeWinRate(record),
    });
  }
  return rows.sort(
    (a, b) =>
      b.played - a.played || a.opponentLeader.localeCompare(b.opponentLeader),
  );
}

export function bestPlacement(
  results: PlayerResult[],
  events: Event[],
): BestPlacement | null {
  if (results.length === 0) return null;
  const idx = indexEvents(events);
  const sorted = [...results].sort((a, b) => a.placement - b.placement);
  const best = sorted[0];
  return {
    eventId: best.eventId,
    eventName: idx.get(best.eventId)?.name ?? best.eventId,
    placement: best.placement,
    totalPlayers: best.totalPlayers,
  };
}

export function citiesVisited(
  results: PlayerResult[],
  events: Event[],
): CityVisit[] {
  const idx = indexEvents(events);
  const byCity = new Map<string, CityVisit>();
  for (const r of results) {
    if (r.matches.length === 0) continue;
    const ev = idx.get(r.eventId);
    if (!ev) continue;
    const key = `${ev.location.city}|${ev.location.country}`;
    const existing = byCity.get(key);
    if (existing) {
      existing.count++;
    } else {
      byCity.set(key, {
        city: ev.location.city,
        country: ev.location.country,
        lat: ev.location.lat,
        lng: ev.location.lng,
        count: 1,
      });
    }
  }
  return [...byCity.values()].sort(
    (a, b) => b.count - a.count || a.city.localeCompare(b.city),
  );
}

export function budgetByCategory(expenses: Expense[]): BudgetCategoryRow[] {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  }
  const rows: BudgetCategoryRow[] = [];
  for (const [category, amount] of byCat) {
    rows.push({
      category,
      amount,
      share: total > 0 ? amount / total : 0,
    });
  }
  return rows.sort(
    (a, b) => b.amount - a.amount || a.category.localeCompare(b.category),
  );
}

export function budgetByEvent(
  expenses: Expense[],
  results: PlayerResult[],
  events: Event[],
): BudgetEventRow[] {
  const idx = indexEvents(events);
  const spentByEvent = new Map<string, number>();
  for (const e of expenses) {
    spentByEvent.set(
      e.eventId,
      (spentByEvent.get(e.eventId) ?? 0) + e.amount,
    );
  }
  const prizesByEvent = new Map<string, number>();
  for (const r of results) {
    prizesByEvent.set(r.eventId, (prizesByEvent.get(r.eventId) ?? 0) + r.prizes);
  }
  const eventIds = new Set<string>([
    ...spentByEvent.keys(),
    ...prizesByEvent.keys(),
  ]);
  const rows: BudgetEventRow[] = [];
  for (const eventId of eventIds) {
    const ev = idx.get(eventId);
    if (!ev) continue;
    const spent = spentByEvent.get(eventId) ?? 0;
    const prizes = prizesByEvent.get(eventId) ?? 0;
    rows.push({
      eventId,
      eventName: ev.name,
      date: ev.date,
      spent,
      prizes,
      net: prizes - spent,
    });
  }
  return rows.sort(
    (a, b) => b.date.getTime() - a.date.getTime() || a.eventName.localeCompare(b.eventName),
  );
}

export function budgetTotals(
  expenses: Expense[],
  results: PlayerResult[],
): BudgetTotals {
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const prizes = results.reduce((s, r) => s + r.prizes, 0);
  return { spent, prizes, net: prizes - spent };
}

export function computeAvailableYears(
  events: Event[],
  results: PlayerResult[],
  expenses: Expense[],
): number[] {
  const idx = indexEvents(events);
  const years = new Set<number>();
  years.add(new Date().getFullYear());
  for (const r of results) {
    const ev = idx.get(r.eventId);
    if (ev) years.add(ev.date.getFullYear());
  }
  for (const e of expenses) {
    const ev = idx.get(e.eventId);
    if (ev) years.add(ev.date.getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

