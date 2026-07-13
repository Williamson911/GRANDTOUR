import { generateEventId, slugify } from './slug';

describe('slugify', () => {
  it('lowercases, strips accents, and hyphenates', () => {
    expect(slugify('Gametrade Distribuzione — Parma')).toBe(
      'gametrade-distribuzione-parma',
    );
  });

  it('strips leading/trailing punctuation', () => {
    expect(slugify('  Épée !!')).toBe('epee');
  });
});

describe('generateEventId', () => {
  it('builds an id from name, city and year-month', () => {
    const id = generateEventId(
      'Victory Road',
      'Sabadell',
      new Date('2026-06-28'),
      new Set(),
    );
    expect(id).toBe('victory-road-sabadell-2026-06');
  });

  it('appends a numeric suffix on collision', () => {
    const existing = new Set(['victory-road-sabadell-2026-06']);
    const id = generateEventId(
      'Victory Road',
      'Sabadell',
      new Date('2026-06-28'),
      existing,
    );
    expect(id).toBe('victory-road-sabadell-2026-06-2');
  });

  it('keeps incrementing the suffix past the first collision', () => {
    const existing = new Set([
      'victory-road-sabadell-2026-06',
      'victory-road-sabadell-2026-06-2',
    ]);
    const id = generateEventId(
      'Victory Road',
      'Sabadell',
      new Date('2026-06-28'),
      existing,
    );
    expect(id).toBe('victory-road-sabadell-2026-06-3');
  });
});
