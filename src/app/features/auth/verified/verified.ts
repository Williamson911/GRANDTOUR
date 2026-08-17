import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-verified',
  imports: [],
  templateUrl: './verified.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verified {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly status = signal<'loading' | 'success' | 'error'>('loading');
  protected readonly username = signal<string>('');

  constructor() {
    const langParam = this.route.snapshot.queryParamMap.get('lang');
    if (langParam === 'fr' || langParam === 'en') {
      this.i18n.setLang(langParam);
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      return;
    }

    void this.confirm(token);
  }

  private async confirm(token: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ username: string }>(`${environment.apiUrl}/auth/confirm`, {
          params: { token },
        }),
      );
      this.username.set(response.username);
      this.status.set('success');
    } catch {
      this.status.set('error');
    }
  }

  protected continue(): void {
    void this.router.navigate(['/login']);
  }
}
