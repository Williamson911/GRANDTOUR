import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

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
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly user = this.auth.currentUser;
  protected readonly username = computed(
    () => this.user()?.username ?? '',
  );

  protected continue(): void {
    void this.router.navigate(['/map']);
  }
}
