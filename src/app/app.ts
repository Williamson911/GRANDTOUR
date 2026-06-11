import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from './core/services/auth';
import { I18nService, Lang } from './core/services/i18n';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly session = this.auth.session;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly lang = this.i18n.lang;
  protected readonly menuOpen = signal(false);

  protected readonly nav = [
    { path: '/map', labelKey: 'nav.map' },
    { path: '/calendar', labelKey: 'nav.calendar' },
    { path: '/season', labelKey: 'nav.season' },
    { path: '/budget', labelKey: 'nav.budget' },
    { path: '/dashboard', labelKey: 'nav.dashboard' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }

  protected async logout(): Promise<void> {
    this.menuOpen.set(false);
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
