import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth';

interface RegistrationRow {
  id: string;
  userId: string;
  eventId: string;
  createdAt: number;
}

const URL = `${API_BASE_URL}/registrations`;

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _ids = signal<ReadonlySet<string>>(new Set());

  readonly ids: Signal<ReadonlySet<string>> = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);

  private rowIdByEvent = new Map<string, string>();

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this.rowIdByEvent.clear();
        this._ids.set(new Set());
        return;
      }
      try {
        const rows = await firstValueFrom(
          this.http.get<RegistrationRow[]>(URL, { params: { userId } }),
        );
        this.rowIdByEvent = new Map(rows.map((r) => [r.eventId, r.id]));
        this._ids.set(new Set(rows.map((r) => r.eventId)));
      } catch (err) {
        console.error('registrations load failed', err);
        this.rowIdByEvent.clear();
        this._ids.set(new Set());
      }
    });
  }

  has(eventId: string): boolean {
    return this._ids().has(eventId);
  }

  async set(eventId: string, registered: boolean): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;

    if (registered && !this._ids().has(eventId)) {
      const draft = { userId, eventId, createdAt: Date.now() };
      this._ids.update((s) => new Set(s).add(eventId));
      try {
        const created = await firstValueFrom(
          this.http.post<RegistrationRow>(URL, draft),
        );
        this.rowIdByEvent.set(eventId, created.id);
      } catch (err) {
        console.error('register failed', err);
      }
    } else if (!registered && this._ids().has(eventId)) {
      const rowId = this.rowIdByEvent.get(eventId);
      this._ids.update((s) => {
        const n = new Set(s);
        n.delete(eventId);
        return n;
      });
      this.rowIdByEvent.delete(eventId);
      if (!rowId) return;
      try {
        await firstValueFrom(this.http.delete(`${URL}/${rowId}`));
      } catch (err) {
        console.error('unregister failed', err);
      }
    }
  }

  async toggle(eventId: string): Promise<void> {
    await this.set(eventId, !this.has(eventId));
  }
}
