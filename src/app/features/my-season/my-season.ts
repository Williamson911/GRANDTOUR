import { afterNextRender, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Event } from '../../core/models/event';
import { EventService } from '../../core/services/event';
import { I18nService } from '../../core/services/i18n';
import { EventListItem } from '../../shared/components/event-list-item/event-list-item';

@Component({
  selector: 'app-my-season',
  imports: [EventListItem],
  templateUrl: './my-season.html',
  styleUrl: './my-season.scss',
})
export class MySeason {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;

  protected readonly upcoming = computed(() => {
    const now = Date.now();
    return this.eventService
      .events()
      .filter((e) => e.registered && e.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  protected readonly past = computed(() => {
    const now = Date.now();
    return this.eventService
      .events()
      .filter((e) => e.registered && e.date.getTime() < now)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  constructor() {
    afterNextRender(() => {
      void this.eventService.load();
    });
  }

  protected onRegisterToggle(event: Event): void {
    this.eventService.setRegistered(event.id, !event.registered);
  }

  protected openDetail(event: Event): void {
    this.router.navigate(['/event', event.id]);
  }
}
