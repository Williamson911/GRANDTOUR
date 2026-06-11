import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { Expense, ExpenseCategory } from '../models/expense';
import { AuthService } from './auth';
import { supabase } from './supabase';

interface ExpenseRow {
  id: string;
  event_id: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    eventId: row.event_id,
    category: row.category,
    amount: Number(row.amount),
    currency: 'EUR',
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: new Date(row.created_at).getTime(),
  };
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly auth = inject(AuthService);
  private readonly _rows = signal<ExpenseRow[]>([]);

  readonly expenses: Signal<Expense[]> = computed(() =>
    this._rows().map(toExpense),
  );
  readonly totalAll = computed(() =>
    this._rows().reduce((sum, e) => sum + Number(e.amount), 0),
  );

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this._rows.set([]);
        return;
      }
      const { data, error } = await supabase
        .from('expenses')
        .select('id, event_id, category, amount, currency, notes, created_at');
      if (error) {
        console.error('expenses load failed', error);
        this._rows.set([]);
        return;
      }
      this._rows.set((data ?? []) as ExpenseRow[]);
    });
  }

  forEvent(eventId: string): Expense[] {
    return this._rows()
      .filter((e) => e.event_id === eventId)
      .map(toExpense);
  }

  totalForEvent(eventId: string): number {
    return this._rows()
      .filter((e) => e.event_id === eventId)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  async add(input: {
    eventId: string;
    category: ExpenseCategory;
    amount: number;
    notes?: string;
  }): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        event_id: input.eventId,
        category: input.category,
        amount: input.amount,
        currency: 'EUR',
        notes: input.notes ?? null,
      })
      .select('id, event_id, category, amount, currency, notes, created_at')
      .single();
    if (error) {
      console.error('expense add failed', error);
      return;
    }
    this._rows.update((list) => [...list, data as ExpenseRow]);
  }

  async remove(id: string): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    this._rows.update((list) => list.filter((e) => e.id !== id));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.error('expense remove failed', error);
  }
}
