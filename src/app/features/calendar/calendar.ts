import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Event } from '../../core/models/event';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { EventListItem } from '../../shared/components/event-list-item/event-list-item';

type TypeFilter = 'all' | 'Regional' | 'Finals';
type PeriodFilter = 'all' | 'upcoming' | 'past';

@Component({
  selector: 'app-calendar',
  imports: [EventListItem],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly typeFilter = signal<TypeFilter>('all');
  protected readonly countryFilter = signal<string>('all');
  protected readonly periodFilter = signal<PeriodFilter>('upcoming');
  protected readonly searchQuery = signal<string>('');

  protected readonly typeOptions: TypeFilter[] = ['all', 'Regional', 'Finals'];
  protected readonly periodOptions: PeriodFilter[] = ['all', 'upcoming', 'past'];

  protected readonly countries = computed(() => {
    const set = new Set(
      this.eventService.events().map((e) => e.location.country),
    );
    return [...set].sort();
  });

  protected readonly filtered = computed(() => {
    const now = Date.now();
    const t = this.typeFilter();
    const c = this.countryFilter();
    const p = this.periodFilter();
    const q = this.searchQuery().trim().toLowerCase();
    return this.eventService
      .events()
      .filter((e) => {
        if (t !== 'all' && e.type !== t) return false;
        if (c !== 'all' && e.location.country !== c) return false;
        const eventTime = e.date.getTime();
        if (p === 'upcoming' && eventTime < now) return false;
        if (p === 'past' && eventTime >= now) return false;
        if (q) {
          const hay = `${e.name} ${e.location.city} ${e.location.venue}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  protected readonly countLabelKey = computed(() =>
    this.filtered().length > 1 ? 'calendar.countPlural' : 'calendar.count',
  );

  constructor() {
    afterNextRender(() => {
      void this.eventService.load();
    });
  }

  protected setType(value: TypeFilter): void {
    this.typeFilter.set(value);
  }

  protected onCountryChange(value: string): void {
    this.countryFilter.set(value);
  }

  protected setPeriod(value: PeriodFilter): void {
    this.periodFilter.set(value);
  }

  protected reset(): void {
    this.typeFilter.set('all');
    this.countryFilter.set('all');
    this.periodFilter.set('upcoming');
    this.searchQuery.set('');
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected onRegisterToggle(event: Event): void {
    this.eventService.setRegistered(event.id, !event.registered);
  }

  protected openDetail(event: Event): void {
    this.router.navigate(['/event', event.id]);
  }

  protected typeLabel(value: TypeFilter): string {
    if (value === 'all') return this.i18n.t('calendar.filter.type.all');
    return value;
  }

  protected periodLabel(value: PeriodFilter): string {
    return this.i18n.t(`calendar.filter.period.${value}`);
  }
}
