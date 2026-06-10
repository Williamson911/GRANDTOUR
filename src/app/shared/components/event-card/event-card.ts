import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';

import { Event } from '../../../core/models/event';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-event-card',
  imports: [DatePipe],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  protected readonly i18n = inject(I18nService);
  readonly event = input.required<Event>();
  readonly registerToggled = output<Event>();
  readonly closed = output<void>();

  protected readonly lang = this.i18n.lang;
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );
  protected readonly variantClass = computed(
    () => `event-card--${this.event().type.toLowerCase()}`,
  );

  protected toggle(): void {
    this.registerToggled.emit(this.event());
  }

  protected close(): void {
    this.closed.emit();
  }
}
