import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { Event } from '../../../core/models/event';
import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-event-card',
  imports: [DatePipe],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  readonly event = input.required<Event>();
  readonly registerToggled = output<Event>();
  readonly closed = output<void>();

  protected readonly lang = this.i18n.lang;
  protected readonly loggedIn = computed(() => this.auth.session() !== null);
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );
  protected readonly variantClass = computed(
    () => `event-card--${this.event().type.toLowerCase()}`,
  );

  protected toggle(): void {
    if (!this.loggedIn()) {
      void this.router.navigate(['/register'], {
        queryParams: { returnTo: this.router.url },
      });
      return;
    }
    this.registerToggled.emit(this.event());
  }

  protected close(): void {
    this.closed.emit();
  }
}
