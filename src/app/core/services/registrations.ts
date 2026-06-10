import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { AuthService } from './auth';

const KEY_PREFIX = 'grandtour.registrations.v1.';

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
  private readonly auth = inject(AuthService);
  private readonly _ids = signal<ReadonlySet<string>>(new Set());

  readonly ids: Signal<ReadonlySet<string>> = this._ids.asReadonly();
  readonly count = computed(() => this._ids().size);

  constructor() {
    effect(() => {
      const userId = this.auth.currentUserId();
      this._ids.set(this.read(userId));
    });
  }

  has(eventId: string): boolean {
    return this._ids().has(eventId);
  }

  set(eventId: string, registered: boolean): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const next = new Set(this._ids());
    if (registered) next.add(eventId);
    else next.delete(eventId);
    this._ids.set(next);
    this.persist(userId, next);
  }

  toggle(eventId: string): void {
    this.set(eventId, !this.has(eventId));
  }

  private read(userId: string | null): ReadonlySet<string> {
    if (!userId) return new Set();
    try {
      const raw = localStorage.getItem(KEY_PREFIX + userId);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  private persist(userId: string, set: ReadonlySet<string>): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
  }
}
