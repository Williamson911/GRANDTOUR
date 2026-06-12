import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-verified',
  imports: [],
  templateUrl: './verified.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verified {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly user = this.auth.currentUser;
  protected readonly username = computed(
    () => this.user()?.username ?? '',
  );

  constructor() {
    const langParam = this.route.snapshot.queryParamMap.get('lang');
    if (langParam === 'fr' || langParam === 'en') {
      this.i18n.setLang(langParam);
    }
  }

  protected continue(): void {
    void this.router.navigate(['/map']);
  }
}
