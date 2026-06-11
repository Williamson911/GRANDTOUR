import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth';
import { DataAvailabilityService } from './core/services/data-availability';
import { I18nService, Lang } from './core/services/i18n';
import { ServerDown } from './features/server-down/server-down';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ServerDown],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly availability = inject(DataAvailabilityService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly session = this.auth.session;
  protected readonly lang = this.i18n.lang;
  protected readonly online = this.availability.online;

  protected readonly nav = [
    { path: '/map', labelKey: 'nav.map' },
    { path: '/calendar', labelKey: 'nav.calendar' },
    { path: '/season', labelKey: 'nav.season' },
    { path: '/budget', labelKey: 'nav.budget' },
    { path: '/dashboard', labelKey: 'nav.dashboard' },
  ];

  protected setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
