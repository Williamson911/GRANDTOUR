import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { Event } from '../../../core/models/event';
import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-event-list-item',
  imports: [DatePipe],
  templateUrl: './event-list-item.html',
  styleUrl: './event-list-item.scss',
})
export class EventListItem {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  readonly event = input.required<Event>();
  readonly showDetail = input<boolean>(true);
  readonly registerToggled = output<Event>();
  readonly detailRequested = output<Event>();

  protected readonly lang = this.i18n.lang;
  protected readonly loggedIn = computed(() => this.auth.session() !== null);
  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );
  protected readonly variantClass = computed(
    () => `event-list-item--${this.event().type.toLowerCase()}`,
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

  protected openDetail(): void {
    this.detailRequested.emit(this.event());
  }
}
