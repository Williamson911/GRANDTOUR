import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

const DISMISSED_KEY = 'grandtour.signupCtaDismissed.v1';

@Component({
  selector: 'app-signup-cta',
  imports: [RouterLink],
  templateUrl: './signup-cta.html',
  styleUrl: './signup-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupCta {
  private readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  private readonly _dismissed = signal(this.readDismissed());

  protected readonly visible = computed(
    () => this.auth.session() === null && !this._dismissed(),
  );

  protected dismiss(): void {
    this._dismissed.set(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  private readDismissed(): boolean {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
