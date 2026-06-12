import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ExpenseCategory } from '../../core/models/expense';
import { MatchResult } from '../../core/models/match';
import { BudgetService } from '../../core/services/budget';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { SeasonService } from '../../core/services/season';

const CATEGORIES: ExpenseCategory[] = [
  'Transport',
  'Hotel',
  'Entry',
  'Food',
  'Other',
];
const MATCH_RESULTS: MatchResult[] = ['Win', 'Loss', 'Draw', 'Bye'];

@Component({
  selector: 'app-event-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail {
  private readonly eventService = inject(EventService);
  private readonly season = inject(SeasonService);
  private readonly budget = inject(BudgetService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly i18n = inject(I18nService);

  readonly eventId = input<string>('');

  protected readonly lang = this.i18n.lang;
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );
  protected readonly categories = CATEGORIES;
  protected readonly matchResults = MATCH_RESULTS;

  protected readonly event = computed(() =>
    this.eventService.byId(this.eventId()),
  );
  protected readonly result = computed(() =>
    this.season.forEvent(this.eventId()),
  );
  protected readonly expenses = computed(() =>
    this.budget
      .forEvent(this.eventId())
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt),
  );
  protected readonly totalSpent = computed(() =>
    this.expenses().reduce((sum, e) => sum + e.amount, 0),
  );
  protected readonly prizes = computed(() => this.result()?.prizes ?? 0);
  protected readonly net = computed(() => this.prizes() - this.totalSpent());

  protected readonly record = computed(() => {
    const matches = this.result()?.matches ?? [];
    return {
      w: matches.filter((m) => m.result === 'Win').length,
      l: matches.filter((m) => m.result === 'Loss').length,
      d: matches.filter((m) => m.result === 'Draw').length,
      b: matches.filter((m) => m.result === 'Bye').length,
    };
  });
  protected readonly recordLabel = computed(() => {
    const r = this.record();
    return this.i18n.t('detail.matches.record', r);
  });

  protected readonly resultSaved = signal(false);

  protected readonly resultForm: FormGroup = this.fb.group({
    placement: [1, [Validators.required, Validators.min(1)]],
    totalPlayers: [0, [Validators.required, Validators.min(1)]],
    deckName: ['', Validators.required],
    leaderPlayed: ['', Validators.required],
    prizes: [0, [Validators.min(0)]],
    notes: [''],
  });

  protected readonly matchForm: FormGroup = this.fb.group({
    opponentLeader: ['', Validators.required],
    opponentName: [''],
    result: ['Win' as MatchResult, Validators.required],
  });

  protected readonly expenseForm: FormGroup = this.fb.group({
    category: ['Transport' as ExpenseCategory, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  constructor() {
    afterNextRender(() => {
      void this.eventService.load();
    });

    // hydrate result form when result changes (e.g. on first load)
    let hydrated = false;
    const sync = () => {
      const r = this.result();
      if (r && !hydrated) {
        this.resultForm.patchValue(
          {
            placement: r.placement,
            totalPlayers: r.totalPlayers,
            deckName: r.deckName,
            leaderPlayed: r.leaderPlayed,
            prizes: r.prizes,
            notes: r.notes ?? '',
          },
          { emitEvent: false },
        );
        hydrated = true;
      }
    };
    // run sync after each render
    afterNextRender(sync);
  }

  protected back(): void {
    this.router.navigate(['/season']);
  }

  protected saveResult(): void {
    if (this.resultForm.invalid) {
      this.resultForm.markAllAsTouched();
      return;
    }
    const v = this.resultForm.value;
    this.season.upsertResult(this.eventId(), {
      placement: Number(v.placement),
      totalPlayers: Number(v.totalPlayers),
      deckName: String(v.deckName).trim(),
      leaderPlayed: String(v.leaderPlayed).trim(),
      prizes: Number(v.prizes) || 0,
      notes: v.notes ? String(v.notes) : undefined,
    });
    this.resultSaved.set(true);
    setTimeout(() => this.resultSaved.set(false), 2500);
  }

  protected deleteResult(): void {
    if (!confirm(this.i18n.t('detail.result.deleteConfirm'))) return;
    this.season.deleteResult(this.eventId());
    this.resultForm.reset({
      placement: 1,
      totalPlayers: 0,
      deckName: '',
      leaderPlayed: '',
      prizes: 0,
      notes: '',
    });
  }

  protected addMatch(): void {
    if (!this.result()) {
      this.resultForm.markAllAsTouched();
      return;
    }
    if (this.matchForm.invalid) {
      this.matchForm.markAllAsTouched();
      return;
    }
    const v = this.matchForm.value;
    this.season.addMatch(this.eventId(), {
      opponentLeader: String(v.opponentLeader).trim(),
      opponentName: v.opponentName ? String(v.opponentName).trim() : undefined,
      result: v.result as MatchResult,
    });
    this.matchForm.reset({ opponentLeader: '', opponentName: '', result: 'Win' });
  }

  protected deleteMatch(round: number): void {
    this.season.deleteMatch(this.eventId(), round);
  }

  protected addExpense(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }
    const v = this.expenseForm.value;
    this.budget.add({
      eventId: this.eventId(),
      category: v.category as ExpenseCategory,
      amount: Number(v.amount),
      notes: v.notes ? String(v.notes) : undefined,
    });
    this.expenseForm.reset({
      category: 'Transport',
      amount: 0,
      notes: '',
    });
  }

  protected deleteExpense(id: string): void {
    this.budget.remove(id);
  }

  protected matchResultLabel(result: MatchResult): string {
    return this.i18n.t(`detail.matches.result.${result.toLowerCase()}`);
  }

  protected categoryLabel(category: ExpenseCategory): string {
    return this.i18n.t(`detail.expenses.cat.${category}`);
  }

  protected blockNonNumeric(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }
}
