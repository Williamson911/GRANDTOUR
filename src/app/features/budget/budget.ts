import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ExpenseCategory } from '../../core/models/expense';
import { BudgetService } from '../../core/services/budget';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { SeasonService } from '../../core/services/season';
import {
  budgetByCategory,
  budgetByEvent,
  BudgetEventRow,
  budgetTotals,
  computeAvailableYears,
  filterExpensesByYear,
  filterResultsByYear,
} from '../../core/stats/season-stats';

type SortKey = 'event' | 'date' | 'spent' | 'prizes' | 'net';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-budget',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Budget {
  private readonly eventService = inject(EventService);
  private readonly season = inject(SeasonService);
  private readonly budget = inject(BudgetService);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );

  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly sortKey = signal<SortKey>('date');
  protected readonly sortDir = signal<SortDir>('desc');

  private readonly events = computed(() => this.eventService.events());
  private readonly results = computed(() => this.season.allResults());
  private readonly expenses = computed(() => this.budget.expenses());

  protected readonly availableYears = computed(() =>
    computeAvailableYears(this.events(), this.results(), this.expenses()),
  );

  private readonly filteredResults = computed(() =>
    filterResultsByYear(this.results(), this.events(), this.selectedYear()),
  );
  private readonly filteredExpenses = computed(() =>
    filterExpensesByYear(this.expenses(), this.events(), this.selectedYear()),
  );

  protected readonly totals = computed(() =>
    budgetTotals(this.filteredExpenses(), this.filteredResults()),
  );
  protected readonly byCategory = computed(() =>
    budgetByCategory(this.filteredExpenses()),
  );

  private readonly byEvent = computed(() =>
    budgetByEvent(this.filteredExpenses(), this.filteredResults(), this.events()),
  );
  protected readonly sortedByEvent = computed(() => {
    const rows = [...this.byEvent()];
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    rows.sort((a, b) => dir * compareBy(a, b, key));
    return rows;
  });

  constructor() {
    afterNextRender(() => {
      void this.eventService.load();
    });
  }

  protected onYearChange(value: string): void {
    const y = Number(value);
    if (!Number.isNaN(y)) this.selectedYear.set(y);
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'date' ? 'desc' : 'desc');
    }
  }

  protected sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ↑' : ' ↓';
  }

  protected categoryLabel(category: ExpenseCategory): string {
    return this.i18n.t(`detail.expenses.cat.${category}`);
  }

  protected netClass(value: number): string {
    if (value > 0) return 'budget__net--positive';
    if (value < 0) return 'budget__net--negative';
    return '';
  }
}

function compareBy(a: BudgetEventRow, b: BudgetEventRow, key: SortKey): number {
  switch (key) {
    case 'event':
      return a.eventName.localeCompare(b.eventName);
    case 'date':
      return a.date.getTime() - b.date.getTime();
    case 'spent':
      return a.spent - b.spent;
    case 'prizes':
      return a.prizes - b.prizes;
    case 'net':
      return a.net - b.net;
  }
}
