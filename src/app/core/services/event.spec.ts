import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { dehydrate, EventService, hydrate } from './event';

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
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
  it('maps a backend EventIndexResponse into the nested Event shape', () => {
    const event = hydrate({
      id: 'test-event-id',
      name: 'Test Event',
      type: { id: 1, name: 'Regional', icon: '🏆', color: '#d4af37' },
      date: '2026-06-14',
      address: {
        city: 'Rungis',
        country: 'France',
        venue: 'Espace Jean Monnet',
        lat: 48.7569,
        lng: 2.3633,
      },
      registerLink: 'https://example.com',
      registered: true,
    });

    expect(event.type).toBe('Regional');
    expect(event.location).toEqual({
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
    });
    expect(event.registerLink).toBe('https://example.com');
    expect(event.registered).toBe(true);
  });

  it('maps a null registerLink to undefined', () => {
    const event = hydrate({
      id: 'test-event-id',
      name: 'Test Event',
      type: { id: 2, name: 'Finals', icon: '🥇', color: '#c0392b' },
      date: '2026-06-14',
      address: { city: 'Rungis', country: 'France', venue: 'Venue', lat: 0, lng: 0 },
      registerLink: null,
      registered: false,
    });
    expect(event.registerLink).toBeUndefined();
  });
});

describe('dehydrate', () => {
  it('flattens an EventInput into a backend EventRequest payload', () => {
    const row = dehydrate(1, {
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
      name: 'Test Event',
      eventTypeId: 1,
      date: '2026-06-14',
      city: 'Rungis',
      country: 'France',
      venue: 'Espace Jean Monnet',
      lat: 48.7569,
      lng: 2.3633,
      registerLink: 'https://example.com',
    });
  });

  it('stores a missing registerLink as null', () => {
    const row = dehydrate(2, {
      name: 'Test Event',
      type: 'Finals',
      date: new Date('2026-06-14'),
      city: 'Rungis',
      country: 'France',
      venue: 'Venue',
      lat: 0,
      lng: 0,
    });
    expect(row.registerLink).toBeNull();
  });
});
