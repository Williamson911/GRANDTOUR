import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Event } from '../../core/models/event';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { createDarkTileLayer } from '../../core/utils/leaflet-tile';
import { EventCard } from '../../shared/components/event-card/event-card';
import { SignupCta } from '../../shared/components/signup-cta/signup-cta';

const EUROPE_CENTER: L.LatLngTuple = [50.0, 10.0];
const EUROPE_ZOOM = 4;

@Component({
  selector: 'app-map',
  imports: [EventCard, SignupCta],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map implements OnDestroy {
  private readonly eventService = inject(EventService);
  protected readonly i18n = inject(I18nService);
  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  private leafletMap?: L.Map;
  private markerLayer?: L.LayerGroup;
  private resizeObserver?: ResizeObserver;

  protected readonly selected = signal<Event | null>(null);
  protected readonly upcoming = computed(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return this.eventService
      .events()
      .filter((e) => new Date(e.date).getTime() >= startOfToday.getTime());
  });
  protected readonly lang = this.i18n.lang;

  constructor() {
    afterNextRender(async () => {
      await this.eventService.load();
      this.initMap();
      this.drawMarkers();
    });
    effect(() => {
      this.upcoming();
      if (this.markerLayer) this.drawMarkers();
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.leafletMap?.remove();
  }

  private initMap(): void {
    const el = this.mapEl()?.nativeElement;
    if (!el || this.leafletMap) return;

    this.leafletMap = L.map(el, {
      center: EUROPE_CENTER,
      zoom: EUROPE_ZOOM,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: true,
      worldCopyJump: true,
    });

    createDarkTileLayer().addTo(this.leafletMap);

    this.markerLayer = L.layerGroup().addTo(this.leafletMap);

    this.leafletMap.on('click', () => this.selected.set(null));

    this.resizeObserver = new ResizeObserver(() => {
      this.leafletMap?.invalidateSize();
    });
    this.resizeObserver.observe(el);
    queueMicrotask(() => this.leafletMap?.invalidateSize());
  }

  private drawMarkers(): void {
    if (!this.markerLayer) return;
    this.markerLayer.clearLayers();

    for (const event of this.upcoming()) {
      const marker = L.marker([event.location.lat, event.location.lng], {
        icon: buildIcon(event),
        title: event.name,
        riseOnHover: true,
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e.originalEvent);
        this.selected.set(event);
      });
      marker.addTo(this.markerLayer);
    }
  }

  protected close(): void {
    this.selected.set(null);
  }

  protected onRegisterToggle(event: Event): void {
    this.eventService.setRegistered(event.id, !event.registered);
    const fresh = this.eventService.byId(event.id);
    if (fresh) this.selected.set(fresh);
    this.drawMarkers();
  }
}

function buildIcon(event: Event): L.DivIcon {
  const kindCls = `gt-marker--${event.type.toLowerCase()}`;
  const regCls = event.registered ? ' gt-marker--registered' : '';
  return L.divIcon({
    className: 'gt-marker-wrap',
    html: `<span class="gt-marker ${kindCls}${regCls}"><span class="gt-marker__pulse"></span><span class="gt-marker__dot"></span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}
