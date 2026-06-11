import { Event } from '../models/event';
import { Expense } from '../models/expense';
import { Match } from '../models/match';
import { PlayerResult } from '../models/player-result';
import {
  aggregateRecord,
  bestPlacement,
  budgetByCategory,
  budgetByEvent,
  budgetTotals,
  citiesVisited,
  computeAvailableYears,
  computeWinRate,
  filterExpensesByYear,
  filterResultsByYear,
  globalWinRate,
  matchupBreakdown,
  winRateByDeck,
} from './season-stats';

function makeEvent(over: Partial<Event> & { id: string; date: Date }): Event {
  return {
    id: over.id,
    name: over.name ?? `Event ${over.id}`,
    type: over.type ?? 'Regional',
    date: over.date,
    location: over.location ?? {
      city: 'Paris',
      country: 'FR',
      venue: 'Venue',
      lat: 48.85,
      lng: 2.35,
    },
    registered: false,
  };
}

function makeMatch(over: Partial<Match> & { result: Match['result'] }): Match {
  return {
    round: over.round ?? 1,
    opponentLeader: over.opponentLeader ?? 'Vegeta',
    result: over.result,
    ...(over.opponentName ? { opponentName: over.opponentName } : {}),
    ...(over.notes ? { notes: over.notes } : {}),
  };
}

function makeResult(
  over: Partial<PlayerResult> & { eventId: string },
): PlayerResult {
  return {
    id: over.id ?? `r-${over.eventId}`,
    eventId: over.eventId,
    deckName: over.deckName ?? 'Goku Black',
    leaderPlayed: over.leaderPlayed ?? 'Goku Black',
    placement: over.placement ?? 1,
    totalPlayers: over.totalPlayers ?? 32,
    prizes: over.prizes ?? 0,
    matches: over.matches ?? [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function makeExpense(
  over: Partial<Expense> & { eventId: string; amount: number },
): Expense {
  return {
    id: over.id ?? `e-${over.eventId}-${over.amount}`,
    eventId: over.eventId,
    category: over.category ?? 'Transport',
    amount: over.amount,
    currency: 'EUR',
    createdAt: 0,
  };
}

describe('aggregateRecord', () => {
  it('returns all-zero on empty input', () => {
    expect(aggregateRecord([])).toEqual({ w: 0, l: 0, d: 0, b: 0 });
  });

  it('counts each result type', () => {
    const matches: Match[] = [
      makeMatch({ result: 'Win' }),
      makeMatch({ result: 'Win' }),
      makeMatch({ result: 'Loss' }),
      makeMatch({ result: 'Draw' }),
      makeMatch({ result: 'Bye' }),
    ];
    expect(aggregateRecord(matches)).toEqual({ w: 2, l: 1, d: 1, b: 1 });
  });
});

describe('computeWinRate', () => {
  it('returns 0 on empty record', () => {
    expect(computeWinRate({ w: 0, l: 0, d: 0, b: 0 })).toBe(0);
  });

  it('uses (W + B + 0.5·D) / (W + L + B + D)', () => {
    expect(computeWinRate({ w: 3, l: 1, d: 0, b: 0 })).toBe(0.75);
    expect(computeWinRate({ w: 2, l: 2, d: 0, b: 0 })).toBe(0.5);
  });

  it('counts bye as a win', () => {
    expect(computeWinRate({ w: 0, l: 0, d: 0, b: 1 })).toBe(1);
    expect(computeWinRate({ w: 1, l: 1, d: 0, b: 1 })).toBeCloseTo(2 / 3);
  });

  it('counts draw as half', () => {
    expect(computeWinRate({ w: 0, l: 0, d: 2, b: 0 })).toBe(0.5);
    expect(computeWinRate({ w: 1, l: 1, d: 2, b: 0 })).toBe(0.5);
  });
});

describe('filterResultsByYear', () => {
  const events = [
    makeEvent({ id: 'a', date: new Date('2025-05-01') }),
    makeEvent({ id: 'b', date: new Date('2026-05-01') }),
  ];
  const results = [makeResult({ eventId: 'a' }), makeResult({ eventId: 'b' })];

  it('keeps only the year-matching results', () => {
    expect(filterResultsByYear(results, events, 2026)).toHaveLength(1);
    expect(filterResultsByYear(results, events, 2026)[0].eventId).toBe('b');
  });

  it('excludes results whose event is missing', () => {
    expect(filterResultsByYear([makeResult({ eventId: 'gone' })], events, 2026))
      .toEqual([]);
  });

  it('returns [] on empty input', () => {
    expect(filterResultsByYear([], events, 2026)).toEqual([]);
  });
});

describe('filterExpensesByYear', () => {
  const events = [
    makeEvent({ id: 'a', date: new Date('2025-05-01') }),
    makeEvent({ id: 'b', date: new Date('2026-05-01') }),
  ];
  it('keeps only the year-matching expenses', () => {
    const expenses = [
      makeExpense({ eventId: 'a', amount: 10 }),
      makeExpense({ eventId: 'b', amount: 20 }),
    ];
    const out = filterExpensesByYear(expenses, events, 2026);
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(20);
  });
});

describe('globalWinRate', () => {
  it('aggregates across all results', () => {
    const results = [
      makeResult({
        eventId: 'a',
        matches: [
          makeMatch({ result: 'Win' }),
          makeMatch({ result: 'Loss' }),
        ],
      }),
      makeResult({
        eventId: 'b',
        matches: [makeMatch({ result: 'Win' }), makeMatch({ result: 'Bye' })],
      }),
    ];
    const out = globalWinRate(results);
    expect(out.played).toBe(4);
    expect(out.record).toEqual({ w: 2, l: 1, d: 0, b: 1 });
    expect(out.winRate).toBe(0.75);
  });

  it('returns zero stats on empty input', () => {
    expect(globalWinRate([])).toEqual({
      played: 0,
      record: { w: 0, l: 0, d: 0, b: 0 },
      winRate: 0,
    });
  });
});

describe('winRateByDeck', () => {
  it('groups by deckName and sorts by played desc', () => {
    const results = [
      makeResult({
        eventId: 'a',
        deckName: 'Black',
        matches: [
          makeMatch({ result: 'Win' }),
          makeMatch({ result: 'Loss' }),
          makeMatch({ result: 'Win' }),
        ],
      }),
      makeResult({
        eventId: 'b',
        deckName: 'Frieza',
        matches: [makeMatch({ result: 'Win' })],
      }),
    ];
    const out = winRateByDeck(results);
    expect(out.map((d) => d.deckName)).toEqual(['Black', 'Frieza']);
    expect(out[0].played).toBe(3);
    expect(out[0].record).toEqual({ w: 2, l: 1, d: 0, b: 0 });
  });

  it('returns [] on empty input', () => {
    expect(winRateByDeck([])).toEqual([]);
  });
});

describe('matchupBreakdown', () => {
  const results = [
    makeResult({
      eventId: 'a',
      leaderPlayed: 'Black',
      matches: [
        makeMatch({ opponentLeader: 'Vegeta', result: 'Win' }),
        makeMatch({ opponentLeader: 'Vegeta', result: 'Loss' }),
        makeMatch({ opponentLeader: 'Cooler', result: 'Win' }),
      ],
    }),
    makeResult({
      eventId: 'b',
      leaderPlayed: 'Frieza',
      matches: [
        makeMatch({ opponentLeader: 'Vegeta', result: 'Win' }),
        makeMatch({ opponentLeader: 'Goku', result: 'Loss' }),
      ],
    }),
  ];

  it('groups by opponent and sorts by played desc', () => {
    const out = matchupBreakdown(results);
    expect(out.map((m) => m.opponentLeader)).toEqual([
      'Vegeta',
      'Cooler',
      'Goku',
    ]);
    expect(out[0].played).toBe(3);
  });

  it('filters by leader played when deckFilter is provided', () => {
    const out = matchupBreakdown(results, 'Black');
    expect(out.find((m) => m.opponentLeader === 'Goku')).toBeUndefined();
    expect(out.find((m) => m.opponentLeader === 'Vegeta')?.played).toBe(2);
  });

  it('returns [] when no match for the deck filter', () => {
    expect(matchupBreakdown(results, 'Unknown')).toEqual([]);
  });
});

describe('bestPlacement', () => {
  const events = [makeEvent({ id: 'a', date: new Date('2026-05-01'), name: 'Regional Paris' })];

  it('returns null on empty results', () => {
    expect(bestPlacement([], events)).toBeNull();
  });

  it('returns the result with the lowest placement', () => {
    const results = [
      makeResult({ eventId: 'a', placement: 7 }),
      makeResult({ eventId: 'a', placement: 2 }),
      makeResult({ eventId: 'a', placement: 4 }),
    ];
    const out = bestPlacement(results, events);
    expect(out?.placement).toBe(2);
    expect(out?.eventName).toBe('Regional Paris');
  });

  it('falls back to eventId as name when event is missing', () => {
    const results = [makeResult({ eventId: 'gone', placement: 1 })];
    expect(bestPlacement(results, events)?.eventName).toBe('gone');
  });
});

describe('citiesVisited', () => {
  const events = [
    makeEvent({
      id: 'a',
      date: new Date('2026-05-01'),
      location: { city: 'Paris', country: 'FR', venue: 'V', lat: 1, lng: 1 },
    }),
    makeEvent({
      id: 'b',
      date: new Date('2026-06-01'),
      location: { city: 'Paris', country: 'FR', venue: 'V', lat: 1, lng: 1 },
    }),
    makeEvent({
      id: 'c',
      date: new Date('2026-07-01'),
      location: { city: 'Berlin', country: 'DE', venue: 'V', lat: 2, lng: 2 },
    }),
  ];

  it('excludes events with no matches logged', () => {
    const results = [
      makeResult({ eventId: 'a', matches: [makeMatch({ result: 'Win' })] }),
      makeResult({ eventId: 'b', matches: [] }),
    ];
    expect(citiesVisited(results, events)).toEqual([
      { city: 'Paris', country: 'FR', lat: 1, lng: 1, count: 1 },
    ]);
  });

  it('groups same city + country and counts visits', () => {
    const results = [
      makeResult({ eventId: 'a', matches: [makeMatch({ result: 'Win' })] }),
      makeResult({ eventId: 'b', matches: [makeMatch({ result: 'Win' })] }),
      makeResult({ eventId: 'c', matches: [makeMatch({ result: 'Win' })] }),
    ];
    const out = citiesVisited(results, events);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      city: 'Paris',
      country: 'FR',
      lat: 1,
      lng: 1,
      count: 2,
    });
    expect(out[1].city).toBe('Berlin');
  });
});

describe('budgetByCategory', () => {
  it('returns [] on empty input', () => {
    expect(budgetByCategory([])).toEqual([]);
  });

  it('sums by category and computes share', () => {
    const expenses = [
      makeExpense({ eventId: 'a', amount: 100, category: 'Transport' }),
      makeExpense({ eventId: 'a', amount: 50, category: 'Hotel' }),
      makeExpense({ eventId: 'b', amount: 50, category: 'Transport' }),
    ];
    const out = budgetByCategory(expenses);
    expect(out.map((r) => r.category)).toEqual(['Transport', 'Hotel']);
    expect(out[0]).toEqual({ category: 'Transport', amount: 150, share: 0.75 });
    expect(out[1]).toEqual({ category: 'Hotel', amount: 50, share: 0.25 });
  });
});

describe('budgetByEvent', () => {
  const events = [
    makeEvent({ id: 'a', date: new Date('2026-05-01'), name: 'A' }),
    makeEvent({ id: 'b', date: new Date('2026-06-01'), name: 'B' }),
  ];

  it('returns [] when no expenses and no prizes', () => {
    expect(budgetByEvent([], [], events)).toEqual([]);
  });

  it('aggregates spent + prizes per event and computes net', () => {
    const expenses = [
      makeExpense({ eventId: 'a', amount: 100 }),
      makeExpense({ eventId: 'a', amount: 50 }),
    ];
    const results = [makeResult({ eventId: 'a', prizes: 200 })];
    const out = budgetByEvent(expenses, results, events);
    expect(out).toEqual([
      {
        eventId: 'a',
        eventName: 'A',
        date: events[0].date,
        spent: 150,
        prizes: 200,
        net: 50,
      },
    ]);
  });

  it('includes events that have prizes but no expenses', () => {
    const results = [makeResult({ eventId: 'b', prizes: 80 })];
    const out = budgetByEvent([], results, events);
    expect(out).toHaveLength(1);
    expect(out[0].eventId).toBe('b');
    expect(out[0].net).toBe(80);
  });

  it('sorts by date desc', () => {
    const expenses = [
      makeExpense({ eventId: 'a', amount: 10 }),
      makeExpense({ eventId: 'b', amount: 10 }),
    ];
    const out = budgetByEvent(expenses, [], events);
    expect(out.map((r) => r.eventId)).toEqual(['b', 'a']);
  });
});

describe('budgetTotals', () => {
  it('returns zeros on empty input', () => {
    expect(budgetTotals([], [])).toEqual({ spent: 0, prizes: 0, net: 0 });
  });

  it('computes net = prizes − spent', () => {
    const expenses = [makeExpense({ eventId: 'a', amount: 300 })];
    const results = [makeResult({ eventId: 'a', prizes: 200 })];
    expect(budgetTotals(expenses, results)).toEqual({
      spent: 300,
      prizes: 200,
      net: -100,
    });
  });
});

describe('computeAvailableYears', () => {
  it('always includes the current year', () => {
    const now = new Date().getFullYear();
    expect(computeAvailableYears([], [], [])).toEqual([now]);
  });

  it('includes years from results and expenses, sorted desc', () => {
    const events = [
      makeEvent({ id: 'a', date: new Date('2023-05-01') }),
      makeEvent({ id: 'b', date: new Date('2025-05-01') }),
    ];
    const results = [makeResult({ eventId: 'a' })];
    const expenses = [makeExpense({ eventId: 'b', amount: 1 })];
    const out = computeAvailableYears(events, results, expenses);
    const currentYear = new Date().getFullYear();
    expect(out[0]).toBeGreaterThanOrEqual(currentYear);
    expect(out).toContain(2023);
    expect(out).toContain(2025);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]).toBeGreaterThan(out[i]);
    }
  });
});
