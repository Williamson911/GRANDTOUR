import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Event } from '../models/event';
import { RegistrationsService } from './registrations';

const EVENTS_URL = 'assets/data/events.json';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
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
    const raw = await firstValueFrom(this.http.get<RawEvent[]>(EVENTS_URL));
    this._raw.set(raw.map(hydrate));
    this.loaded = true;
  }

  byId(id: string): Event | undefined {
    return this.events().find((e) => e.id === id);
  }

  setRegistered(id: string, registered: boolean): void {
    this.registrations.set(id, registered);
  }
}

interface RawEvent extends Omit<Event, 'date'> {
  date: string;
}

function hydrate(raw: RawEvent): Event {
  return { ...raw, date: new Date(raw.date), registered: false };
}
