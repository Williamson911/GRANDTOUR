import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, output, signal } from '@angular/core';
import { from, Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';

import { CardPrinting, printingKey } from '../../../core/models/collection';
import { cardImageUrl, CardsService, PrintingsPage } from '../../../core/services/cards';
import { I18nService } from '../../../core/services/i18n';

const CARD_TYPES = [
  'LEADER',
  'BATTLE',
  'EXTRA',
  'UNISON',
  'Z-LEADER',
  'Z-BATTLE',
  'Z-EXTRA',
  'Z-UNISON',
  'TOKEN',
];
const PAGE_SIZE = 24;

@Component({
  selector: 'app-card-grid',
  imports: [],
  templateUrl: './card-grid.html',
  styleUrl: './card-grid.scss',
})
export class CardGrid {
  private readonly cards = inject(CardsService);
  protected readonly i18n = inject(I18nService);

  readonly printingSelected = output<CardPrinting>();

  protected readonly cardTypes = CARD_TYPES;
  protected readonly search = signal('');
  protected readonly type = signal('');
  protected readonly color = signal('');
  protected readonly series = signal('');
  readonly colorOptions = signal<string[]>([]);
  readonly seriesOptions = signal<string[]>([]);
  readonly results = signal<CardPrinting[]>([]);
  readonly totalPages = signal(0);

  private readonly page = signal(0);
  private readonly refresh = new Subject<void>();

  constructor() {
    this.refresh
      .pipe(
        debounceTime(250),
        switchMap(() => from(this.fetchPrintings())),
        takeUntilDestroyed(),
      )
      .subscribe((page) => this.applyPage(page));

    // Bypass the debounce for the initial load — it exists to smooth out rapid
    // filter typing, not to delay the very first render of an empty-filter grid.
    void this.fetchPrintings().then((page) => this.applyPage(page));

    void this.cards.getFacets().then((facets) => {
      this.colorOptions.set(facets.colors);
      this.seriesOptions.set(facets.series);
    });
  }

  private fetchPrintings(): Promise<PrintingsPage> {
    return this.cards.searchPrintings({
      search: this.search() || undefined,
      type: this.type() || undefined,
      color: this.color() || undefined,
      series: this.series() || undefined,
      page: this.page(),
      size: PAGE_SIZE,
    });
  }

  private applyPage(page: PrintingsPage): void {
    this.results.set(page.content);
    this.totalPages.set(page.totalPages);
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.refresh.next();
  }

  onTypeChange(value: string): void {
    this.type.set(value);
    this.page.set(0);
    this.refresh.next();
  }

  onColorChange(value: string): void {
    this.color.set(value);
    this.page.set(0);
    this.refresh.next();
  }

  onSeriesChange(value: string): void {
    this.series.set(value);
    this.page.set(0);
    this.refresh.next();
  }

  nextPage(): void {
    if (this.page() + 1 >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.refresh.next();
  }

  prevPage(): void {
    if (this.page() === 0) return;
    this.page.update((p) => p - 1);
    this.refresh.next();
  }

  select(printing: CardPrinting): void {
    this.printingSelected.emit(printing);
  }

  protected imageUrl(imgLink: string | null): string | null {
    return cardImageUrl(imgLink);
  }

  protected trackByPrinting(_index: number, printing: CardPrinting): string {
    return printingKey(printing);
  }

  protected colorSwatch(color: string): string {
    const hex: Record<string, string> = {
      Red: '#dc2626',
      Blue: '#2563eb',
      Green: '#16a34a',
      Yellow: '#eab308',
      Black: '#27272a',
      White: '#f4f4f5',
      Colorless: '#a1a1aa',
    };
    if (color.includes('/')) {
      const [a, b] = color.split('/');
      const colorA = hex[a] ?? '#a1a1aa';
      const colorB = hex[b] ?? '#a1a1aa';
      return `linear-gradient(135deg, ${colorA} 50%, ${colorB} 50%)`;
    }
    return hex[color] ?? '#a1a1aa';
  }
}
