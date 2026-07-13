import { TestBed } from '@angular/core/testing';

import { dehydrate, EventService, hydrate } from './event';

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts with an empty event list', () => {
    expect(service.events()).toEqual([]);
  });
});

describe('hydrate', () => {
  it('maps a flat Supabase row into the nested Event shape', () => {
    const event = hydrate({
      id: 'test-event-2026-06',
      name: 'Test Event',
      type: 'Regional',
      date: '2026-06-14',
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
      register_link: 'https://example.com',
    });

    expect(event.location).toEqual({
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
    });
    expect(event.registerLink).toBe('https://example.com');
    expect(event.registered).toBe(false);
  });

  it('maps a null register_link to undefined', () => {
    const event = hydrate({
      id: 'test-event-2026-06',
      name: 'Test Event',
      type: 'Finals',
      date: '2026-06-14',
      city: 'Rungis',
      country: 'France',
      venue: 'Venue',
      lat: 0,
      lng: 0,
      register_link: null,
    });
    expect(event.registerLink).toBeUndefined();
  });
});

describe('dehydrate', () => {
  it('flattens an EventInput into a Supabase row payload', () => {
    const row = dehydrate('test-id', {
      name: 'Test Event',
      type: 'Regional',
      date: new Date('2026-06-14'),
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
      registerLink: 'https://example.com',
    });

    expect(row).toEqual({
      id: 'test-id',
      name: 'Test Event',
      type: 'Regional',
      date: '2026-06-14',
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
      register_link: 'https://example.com',
    });
  });

  it('stores a missing registerLink as null', () => {
    const row = dehydrate('test-id', {
      name: 'Test Event',
      type: 'Finals',
      date: new Date('2026-06-14'),
      city: 'Rungis',
      country: 'France',
      venue: 'Venue',
      lat: 0,
      lng: 0,
    });
    expect(row.register_link).toBeNull();
  });
});
