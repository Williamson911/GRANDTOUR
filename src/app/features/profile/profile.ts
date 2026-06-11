import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { I18nService } from '../../core/services/i18n';

function bandaiIdValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const raw: string = control.value ?? '';
  const stripped = raw.replace(/[\s-]/g, '');
  if (stripped === '') return null;
  return /^[0-9]{8,12}$/.test(stripped) ? null : { bandaiInvalid: true };
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly user = this.auth.currentUser;
  protected readonly busy = signal(false);
  protected readonly success = signal(false);
  protected readonly formError = signal('');

  protected readonly dateLocale = computed(() =>
    this.lang() === 'fr' ? 'fr-FR' : 'en-GB',
  );

  protected readonly form: FormGroup = this.fb.group(
    {
      username: [
        '',
        {
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(20),
            Validators.pattern(/^[A-Za-z0-9_-]+$/),
          ],
        },
      ],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email],
        },
      ],
      bandaiTcgId: ['', { validators: [bandaiIdValidator] }],
    },
  );

  constructor() {
    effect(() => {
      const u = this.user();
      if (u) {
        this.form.patchValue(
          {
            username: u.username,
            email: u.email,
            bandaiTcgId: u.bandaiTcgId ?? '',
          },
          { emitEvent: false },
        );
      }
    });
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.busy.set(true);
    this.formError.set('');
    this.success.set(false);

    const result = await this.auth.updateProfile({
      username: this.form.value.username,
      email: this.form.value.email,
      bandaiTcgId: this.form.value.bandaiTcgId || undefined,
    });
    this.busy.set(false);

    if (!result.ok) {
      if (result.reason === 'username-taken') {
        this.form.get('username')?.setErrors({ taken: true });
      } else if (result.reason === 'email-taken') {
        this.form.get('email')?.setErrors({ taken: true });
      } else {
        this.formError.set(this.i18n.t('profile.errors.invalidFields'));
      }
      return;
    }

    this.success.set(true);
    setTimeout(() => this.success.set(false), 2500);
  }

  protected async deleteAccount(): Promise<void> {
    if (this.busy()) return;
    if (!confirm(this.i18n.t('profile.deleteConfirm'))) return;

    this.busy.set(true);
    const ok = await this.auth.deleteAccount();
    if (ok) {
      this.router.navigate(['/login']);
    } else {
      this.busy.set(false);
    }
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
