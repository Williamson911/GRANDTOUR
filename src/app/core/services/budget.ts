import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Expense, ExpenseCategory } from '../models/expense';
import { AuthService } from './auth';

interface ExpenseRow extends Expense {
  userId: string;
}

const URL = `${API_BASE_URL}/expenses`;

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _expenses = signal<ExpenseRow[]>([]);

  readonly expenses: Signal<Expense[]> = computed(() =>
    this._expenses().map(({ userId: _u, ...rest }) => rest),
  );
  readonly totalAll = computed(() =>
    this._expenses().reduce((sum, e) => sum + e.amount, 0),
  );

  constructor() {
    effect(async () => {
      const userId = this.auth.currentUserId();
      if (!userId) {
        this._expenses.set([]);
        return;
      }
      try {
        const rows = await firstValueFrom(
          this.http.get<ExpenseRow[]>(URL, { params: { userId } }),
        );
        this._expenses.set(rows);
      } catch (err) {
        console.error('expenses load failed', err);
        this._expenses.set([]);
      }
    });
  }

  forEvent(eventId: string): Expense[] {
    return this._expenses()
      .filter((e) => e.eventId === eventId)
      .map(({ userId: _u, ...rest }) => rest);
  }

  totalForEvent(eventId: string): number {
    return this._expenses()
      .filter((e) => e.eventId === eventId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  async add(input: {
    eventId: string;
    category: ExpenseCategory;
    amount: number;
    notes?: string;
  }): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    const draft = {
      userId,
      eventId: input.eventId,
      category: input.category,
      amount: input.amount,
      currency: 'EUR' as const,
      ...(input.notes ? { notes: input.notes } : {}),
      createdAt: Date.now(),
    };
    try {
      const created = await firstValueFrom(
        this.http.post<ExpenseRow>(URL, draft),
      );
      this._expenses.update((list) => [...list, created]);
    } catch (err) {
      console.error('expense add failed', err);
    }
  }

  async remove(id: string): Promise<void> {
    const userId = this.auth.currentUserId();
    if (!userId) return;
    this._expenses.update((list) => list.filter((e) => e.id !== id));
    try {
      await firstValueFrom(this.http.delete(`${URL}/${id}`));
    } catch (err) {
      console.error('expense remove failed', err);
    }
  }
}
