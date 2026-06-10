import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';

import { Event } from '../../../core/models/event';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-event-list-item',
  imports: [DatePipe],
  templateUrl: './event-list-item.html',
  styleUrl: './event-list-item.scss',
})
export class EventListItem {
  protected readonly i18n = inject(I18nService);

  readonly event = input.required<Event>();
  readonly showDetail = input<boolean>(true);
  readonly registerToggled = output<Event>();
  readonly detailRequested = output<Event>();

  protected readonly lang = this.i18n.lang;
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );
  protected readonly variantClass = computed(
    () => `event-list-item--${this.event().type.toLowerCase()}`,
  );

  protected toggle(): void {
    this.registerToggled.emit(this.event());
  }

  protected openDetail(): void {
    this.detailRequested.emit(this.event());
  }
}
