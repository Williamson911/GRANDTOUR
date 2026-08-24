import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { Event } from '../../core/models/event';
import { BudgetService } from '../../core/services/budget';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { SeasonService } from '../../core/services/season';
import {
  bestPlacement,
  budgetTotals,
  citiesVisited,
  computeAvailableYears,
  filterExpensesByYear,
  filterResultsByYear,
  globalWinRate,
  leadersPlayed,
  matchupBreakdown,
  winRateByDeck,
} from '../../core/stats/season-stats';
import {
  createDarkTileLayer,
  createGoldDotIcon,
} from '../../core/utils/leaflet-tile';

const NEXT_EVENTS_LIMIT = 3;

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnDestroy {
  private readonly eventService = inject(EventService);
  private readonly season = inject(SeasonService);
  private readonly budget = inject(BudgetService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('cityMap');
  private leafletMap?: L.Map;
  private markerLayer?: L.LayerGroup;
  private resizeObserver?: ResizeObserver;

  protected readonly lang = this.i18n.lang;
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );

  protected readonly selectedYear = signal(new Date().getFullYear());
  protected readonly selectedLeaderId = signal<string>('');

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

  protected readonly wr = computed(() => globalWinRate(this.filteredResults()));
  protected readonly best = computed(() =>
    bestPlacement(this.filteredResults(), this.events()),
  );
  protected readonly cities = computed(() =>
    citiesVisited(this.filteredResults(), this.events()),
  );
  protected readonly citiesCount = computed(() => this.cities().length);
  protected readonly countriesCount = computed(
    () => new Set(this.cities().map((c) => c.country)).size,
  );

  protected readonly deckRows = computed(() =>
    winRateByDeck(this.filteredResults()),
  );
  protected readonly leaderOptions = computed(() =>
    leadersPlayed(this.filteredResults()),
  );
  protected readonly matchupRows = computed(() =>
    matchupBreakdown(
      this.filteredResults(),
      this.selectedLeaderId() || undefined,
    ),
  );

  protected readonly money = computed(() =>
    budgetTotals(this.filteredExpenses(), this.filteredResults()),
  );

  protected readonly nextEvents = computed(() => {
    const now = Date.now();
    return this.events()
      .filter((e) => e.registered && e.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, NEXT_EVENTS_LIMIT);
  });

  protected readonly recordLabel = computed(() => {
    const r = this.wr().record;
    return this.i18n.t('dashboard.wr.record', {
      w: r.w,
      l: r.l,
      d: r.d,
      b: r.b,
    });
  });
  protected readonly playedLabel = computed(() =>
    this.i18n.t('dashboard.wr.played', { count: this.wr().played }),
  );
  protected readonly citiesLabel = computed(() =>
    this.i18n.t('dashboard.cities.count', {
      cities: this.citiesCount(),
      countries: this.countriesCount(),
    }),
  );
  protected readonly bestOutOfLabel = computed(() => {
    const b = this.best();
    return b ? this.i18n.t('dashboard.best.outOf', { total: b.totalPlayers }) : '';
  });

  constructor() {
    afterNextRender(async () => {
      await this.eventService.load();
      this.initMap();
      this.drawCityMarkers();
    });
    effect(() => {
      // re-draw markers when filtered cities change
      this.cities();
      queueMicrotask(() => this.drawCityMarkers());
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.leafletMap?.remove();
  }

  protected onYearChange(value: string): void {
    const y = Number(value);
    if (!Number.isNaN(y)) this.selectedYear.set(y);
  }

  protected onLeaderChange(value: string): void {
    this.selectedLeaderId.set(value);
  }

  protected formatWinRate(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }

  protected openEvent(event: Event): void {
    void this.router.navigate(['/event', event.id]);
  }

  private initMap(): void {
    const el = this.mapEl()?.nativeElement;
    if (!el || this.leafletMap) return;

    this.leafletMap = L.map(el, {
      center: [50.0, 10.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      worldCopyJump: false,
    });

    createDarkTileLayer().addTo(this.leafletMap);

    this.markerLayer = L.layerGroup().addTo(this.leafletMap);

    this.resizeObserver = new ResizeObserver(() => {
      this.leafletMap?.invalidateSize();
    });
    this.resizeObserver.observe(el);
    queueMicrotask(() => this.leafletMap?.invalidateSize());
  }

  private drawCityMarkers(): void {
    if (!this.markerLayer || !this.leafletMap) return;
    this.markerLayer.clearLayers();
    const cities = this.cities();
    if (cities.length === 0) return;

    const markers: L.Marker[] = [];
    for (const city of cities) {
      const marker = L.marker([city.lat, city.lng], {
        icon: createGoldDotIcon(),
        title: `${city.city} · ${city.country}`,
        interactive: false,
      });
      marker.addTo(this.markerLayer);
      markers.push(marker);
    }
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      this.leafletMap.fitBounds(group.getBounds(), {
        padding: [24, 24],
        maxZoom: 6,
      });
    }
  }
}
