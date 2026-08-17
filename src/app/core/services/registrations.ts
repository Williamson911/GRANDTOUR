import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _ids = signal<ReadonlySet<string>>(new Set());

  readonly ids: Signal<ReadonlySet<string>> = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this._ids.set(new Set());
        return;
      }
      try {
        const events = await firstValueFrom(
          this.http.get<{ id: string }[]>(`${environment.apiUrl}/register/me`),
        );
        this._ids.set(new Set(events.map((e) => e.id)));
      } catch (error) {
        console.error('registrations load failed', error);
        this._ids.set(new Set());
      }
    });
  }

  has(eventId: string): boolean {
    return this._ids().has(eventId);
  }

  async set(eventId: string, registered: boolean): Promise<void> {
    if (!this.auth.currentUserId()) return;

    if (registered && !this._ids().has(eventId)) {
      this._ids.update((s) => new Set(s).add(eventId));
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/register/${eventId}`, {}),
        );
      } catch (error) {
        console.error('register failed', error);
        this._ids.update((s) => {
          const n = new Set(s);
          n.delete(eventId);
          return n;
        });
      }
    } else if (!registered && this._ids().has(eventId)) {
      this._ids.update((s) => {
        const n = new Set(s);
        n.delete(eventId);
        return n;
      });
      try {
        await firstValueFrom(
          this.http.delete(`${environment.apiUrl}/register/${eventId}`),
        );
      } catch (error) {
        console.error('unregister failed', error);
        this._ids.update((s) => new Set(s).add(eventId));
      }
    }
  }

  async toggle(eventId: string): Promise<void> {
    await this.set(eventId, !this.has(eventId));
  }
}
