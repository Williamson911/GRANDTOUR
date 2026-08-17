import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Event } from '../models/event';
import { RegistrationsService } from './registrations';

export interface EventInput {
  name: string;
  type: string;
  date: Date;
  city: string;
  country: string;
  venue: string;
  lat: number;
  lng: number;
  registerLink?: string;
}

export type EventWriteResult = { ok: true } | { ok: false; message: string };

interface EventTypeResponse {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface AddressResponse {
  city: string;
  country: string;
  venue: string;
  lat: number;
  lng: number;
}

interface EventIndexResponse {
  id: string;
  name: string;
  type: EventTypeResponse;
  date: string;
  address: AddressResponse;
  registerLink: string | null;
  registered: boolean;
}

interface EventPage {
  content: EventIndexResponse[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly registrations = inject(RegistrationsService);
  private readonly _raw = signal<Event[]>([]);
  private readonly _eventTypes = signal<EventTypeResponse[]>([]);
  private loaded = false;

  readonly events = computed(() => {
    const ids = this.registrations.ids();
    return this._raw().map((e) => ({ ...e, registered: ids.has(e.id) }));
  });
  readonly registered = computed(() => this.events().filter((e) => e.registered));

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const [page, types] = await Promise.all([
        firstValueFrom(
          this.http.get<EventPage>(`${environment.apiUrl}/event`, {
            params: { size: '1000', sort: 'date' },
          }),
        ),
        firstValueFrom(
          this.http.get<EventTypeResponse[]>(`${environment.apiUrl}/event-type`),
        ),
      ]);
      this._eventTypes.set(types);
      this._raw.set(page.content.map(hydrate).sort(byDate));
      this.loaded = true;
    } catch (error) {
      console.error('events load failed', error);
    }
  }

  byId(id: string): Event | undefined {
    return this.events().find((e) => e.id === id);
  }

  setRegistered(id: string, registered: boolean): void {
    this.registrations.set(id, registered);
  }

  async createEvent(input: EventInput): Promise<EventWriteResult> {
    const eventTypeId = this.eventTypeId(input.type);
    if (eventTypeId === undefined) {
      return { ok: false, message: `Unknown event type "${input.type}"` };
    }
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/event`, dehydrate(eventTypeId, input)),
      );
      await this.reload();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: this.errorMessage(err) };
    }
  }

  async updateEvent(id: string, input: EventInput): Promise<EventWriteResult> {
    const eventTypeId = this.eventTypeId(input.type);
    if (eventTypeId === undefined) {
      return { ok: false, message: `Unknown event type "${input.type}"` };
    }
    try {
      await firstValueFrom(
        this.http.put(
          `${environment.apiUrl}/event/${id}`,
          dehydrate(eventTypeId, input),
        ),
      );
      await this.reload();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: this.errorMessage(err) };
    }
  }

  async deleteEvent(id: string): Promise<EventWriteResult> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/event/${id}`));
      this._raw.update((rows) => rows.filter((e) => e.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: this.errorMessage(err) };
    }
  }

  private eventTypeId(typeName: string): number | undefined {
    return this._eventTypes().find((t) => t.name === typeName)?.id;
  }

  private async reload(): Promise<void> {
    this.loaded = false;
    await this.load();
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return String(err.error?.error ?? 'Request failed');
    }
    return 'Request failed';
  }
}

function byDate(a: Event, b: Event): number {
  return a.date.getTime() - b.date.getTime();
}

export function hydrate(raw: EventIndexResponse): Event {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type.name,
    date: new Date(raw.date),
    location: {
      city: raw.address.city,
      country: raw.address.country,
      venue: raw.address.venue,
      lat: raw.address.lat,
      lng: raw.address.lng,
    },
    registerLink: raw.registerLink ?? undefined,
    registered: raw.registered,
  };
}

export function dehydrate(eventTypeId: number, input: EventInput) {
  return {
    name: input.name,
    eventTypeId,
    date: input.date.toISOString().slice(0, 10),
    city: input.city,
    country: input.country,
    venue: input.venue,
    lat: input.lat,
    lng: input.lng,
    registerLink: input.registerLink || null,
  };
}
