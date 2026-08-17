import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Expense, ExpenseCategory } from '../models/expense';
import { AuthService } from './auth';

interface ExpensesResponse {
  id: string;
  userId: string;
  eventId: string;
  category: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function toExpense(row: ExpensesResponse): Expense {
  return {
    id: row.id,
    eventId: row.eventId,
    category: row.category as ExpenseCategory,
    amount: Number(row.amount),
    currency: 'EUR',
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: new Date(row.createdAt).getTime(),
  };
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly _rows = signal<ExpensesResponse[]>([]);

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
      await this.reload();
    });
  }

  private async reload(): Promise<void> {
    try {
      const rows = await firstValueFrom(
        this.http.get<ExpensesResponse[]>(`${environment.apiUrl}/expenses/me`),
      );
      this._rows.set(rows);
    } catch (error) {
      console.error('expenses load failed', error);
      this._rows.set([]);
    }
  }

  forEvent(eventId: string): Expense[] {
    return this._rows()
      .filter((e) => e.eventId === eventId)
      .map(toExpense);
  }

  totalForEvent(eventId: string): number {
    return this._rows()
      .filter((e) => e.eventId === eventId)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  async add(input: {
    eventId: string;
    category: ExpenseCategory;
    amount: number;
    notes?: string;
  }): Promise<void> {
    if (!this.auth.currentUserId()) return;
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/expenses/${input.eventId}`, {
          category: input.category,
          amount: input.amount,
          currency: 'EUR',
          notes: input.notes ?? null,
        }),
      );
      await this.reload();
    } catch (error) {
      console.error('expense add failed', error);
    }
  }

  async remove(id: string): Promise<void> {
    if (!this.auth.currentUserId()) return;
    this._rows.update((list) => list.filter((e) => e.id !== id));
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/expenses/${id}`));
    } catch (error) {
      console.error('expense remove failed', error);
    }
  }
}
