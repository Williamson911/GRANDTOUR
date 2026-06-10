import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';

import { Expense, ExpenseCategory } from '../models/expense';
import { AuthService } from './auth';

const KEY_PREFIX = 'grandtour.expenses.v1.';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly auth = inject(AuthService);
  private readonly _expenses = signal<Expense[]>([]);

  readonly expenses: Signal<Expense[]> = this._expenses.asReadonly();
  readonly totalAll = computed(() =>
    this._expenses().reduce((sum, e) => sum + e.amount, 0),
  );

  constructor() {
    effect(() => {
      const userId = this.auth.currentUserId();
      this._expenses.set(this.read(userId));
    });
  }

  forEvent(eventId: string): Expense[] {
    return this._expenses().filter((e) => e.eventId === eventId);
  }

  totalForEvent(eventId: string): number {
    return this.forEvent(eventId).reduce((sum, e) => sum + e.amount, 0);
  }

  add(input: {
    eventId: string;
    category: ExpenseCategory;
    amount: number;
    notes?: string;
  }): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const expense: Expense = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      category: input.category,
      amount: input.amount,
      currency: 'EUR',
      ...(input.notes ? { notes: input.notes } : {}),
      createdAt: Date.now(),
    };
    this._expenses.update((list) => [...list, expense]);
    this.persist(userId);
  }

  remove(id: string): void {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    this._expenses.update((list) => list.filter((e) => e.id !== id));
    this.persist(userId);
  }

  private read(userId: string | null): Expense[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(KEY_PREFIX + userId);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Expense[]) : [];
    } catch {
      return [];
    }
  }

  private persist(userId: string): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(this._expenses()));
    } catch {
      /* ignore */
    }
  }
}
