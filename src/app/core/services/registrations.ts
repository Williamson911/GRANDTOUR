import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { AuthService } from './auth';
import { supabase } from './supabase';

interface RegistrationRow {
  id: string;
  event_id: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
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
      const { data, error } = await supabase
        .from('registrations')
        .select('id, event_id');
      if (error) {
        console.error('registrations load failed', error);
        this.rowIdByEvent.clear();
        this._ids.set(new Set());
        return;
      }
      const rows = (data ?? []) as RegistrationRow[];
      this.rowIdByEvent = new Map(rows.map((r) => [r.event_id, r.id]));
      this._ids.set(new Set(rows.map((r) => r.event_id)));
    });
  }

  has(eventId: string): boolean {
    return this._ids().has(eventId);
  }

  async set(eventId: string, registered: boolean): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;

    if (registered && !this._ids().has(eventId)) {
      this._ids.update((s) => new Set(s).add(eventId));
      const { data, error } = await supabase
        .from('registrations')
        .insert({ user_id: userId, event_id: eventId })
        .select('id')
        .single();
      if (error) {
        console.error('register failed', error);
        return;
      }
      if (data) this.rowIdByEvent.set(eventId, data.id);
    } else if (!registered && this._ids().has(eventId)) {
      const rowId = this.rowIdByEvent.get(eventId);
      this._ids.update((s) => {
        const n = new Set(s);
        n.delete(eventId);
        return n;
      });
      this.rowIdByEvent.delete(eventId);
      if (!rowId) return;
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', rowId);
      if (error) console.error('unregister failed', error);
    }
  }

  async toggle(eventId: string): Promise<void> {
    await this.set(eventId, !this.has(eventId));
  }
}
