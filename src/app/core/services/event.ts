import { computed, inject, Injectable, signal } from '@angular/core';

import { Event } from '../models/event';
import { generateEventId } from '../utils/slug';
import { RegistrationsService } from './registrations';
import { supabase } from './supabase';

export interface EventInput {
  name: string;
  type: 'Regional' | 'Finals';
  date: Date;
  city: string;
  country: string;
  venue: string;
  lat: number;
  lng: number;
  registerLink?: string;
}

export type EventWriteResult = { ok: true } | { ok: false; message: string };

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly registrations = inject(RegistrationsService);
  private readonly _raw = signal<Event[]>([]);
  private loaded = false;

  readonly events = computed(() => {
    const ids = this.registrations.ids();
    return this._raw().map((e) => ({ ...e, registered: ids.has(e.id) }));
  });
  readonly registered = computed(() => this.events().filter((e) => e.registered));

  async load(): Promise<void> {
    if (this.loaded) return;
    const { data, error } = await supabase.from('events').select('*').order('date');
    if (error) {
      console.error('events load failed', error);
      return;
    }
    this._raw.set((data as EventRow[]).map(hydrate));
    this.loaded = true;
  }

  byId(id: string): Event | undefined {
    return this.events().find((e) => e.id === id);
  }

  setRegistered(id: string, registered: boolean): void {
    this.registrations.set(id, registered);
  }

  async createEvent(input: EventInput): Promise<EventWriteResult> {
    const existingIds = new Set(this._raw().map((e) => e.id));
    const id = generateEventId(input.name, input.city, input.date, existingIds);
    const { data, error } = await supabase
      .from('events')
      .insert(dehydrate(id, input))
      .select()
      .single();
    if (error) {
      console.error('createEvent failed', error);
      return { ok: false, message: error.message };
    }
    const created = hydrate(data as EventRow);
    this._raw.update((rows) => [...rows, created].sort(byDate));
    return { ok: true };
  }

  async updateEvent(id: string, input: EventInput): Promise<EventWriteResult> {
    const { data, error } = await supabase
      .from('events')
      .update(dehydrate(id, input))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('updateEvent failed', error);
      return { ok: false, message: error.message };
    }
    const updated = hydrate(data as EventRow);
    this._raw.update((rows) => rows.map((e) => (e.id === id ? updated : e)).sort(byDate));
    return { ok: true };
  }

  async deleteEvent(id: string): Promise<EventWriteResult> {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      console.error('deleteEvent failed', error);
      return { ok: false, message: error.message };
    }
    this._raw.update((rows) => rows.filter((e) => e.id !== id));
    return { ok: true };
  }
}

interface EventRow {
  id: string;
  name: string;
  type: 'Regional' | 'Finals';
  date: string;
  city: string;
  country: string;
  venue: string;
  lat: number;
  lng: number;
  register_link: string | null;
}

function byDate(a: Event, b: Event): number {
  return a.date.getTime() - b.date.getTime();
}

export function hydrate(raw: EventRow): Event {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    date: new Date(raw.date),
    location: {
      city: raw.city,
      country: raw.country,
      venue: raw.venue,
      lat: raw.lat,
      lng: raw.lng,
    },
    registerLink: raw.register_link ?? undefined,
    registered: false,
  };
}

export function dehydrate(id: string, input: EventInput) {
  return {
    id,
    name: input.name,
    type: input.type,
    date: input.date.toISOString().slice(0, 10),
    city: input.city,
    country: input.country,
    venue: input.venue,
    lat: input.lat,
    lng: input.lng,
    register_link: input.registerLink || null,
  };
}
