import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const conf = group.get('newPasswordConfirm')?.value;
  return pw && conf && pw !== conf ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly newRecoveryCode = signal<string | null>(null);
  protected readonly recoverySaved = signal(false);
  protected readonly justCopied = signal(false);

  protected readonly form: FormGroup = this.fb.group(
    {
      usernameOrEmail: ['', { validators: [Validators.required], updateOn: 'blur' }],
      recoveryCode: ['', { validators: [Validators.required], updateOn: 'blur' }],
      newPassword: [
        '',
        {
          validators: [Validators.required, Validators.minLength(8)],
          updateOn: 'blur',
        },
      ],
      newPasswordConfirm: [
        '',
        { validators: [Validators.required], updateOn: 'blur' },
      ],
    },
    { validators: [passwordsMatch], updateOn: 'blur' },
  );

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.formError.set('');
    this.busy.set(true);
    const result = await this.auth.resetPassword({
      usernameOrEmail: this.form.value.usernameOrEmail,
      recoveryCode: this.form.value.recoveryCode,
      newPassword: this.form.value.newPassword,
    });
    this.busy.set(false);

    if (!result.ok) {
      if (result.reason === 'invalid-recovery') {
        this.formError.set(this.i18n.t('forgot.errors.invalidRecovery'));
      } else {
        this.formError.set(this.i18n.t('forgot.errors.invalidFields'));
      }
      return;
    }

    this.newRecoveryCode.set(result.recoveryCode);
  }

  protected async copyRecovery(): Promise<void> {
    const code = this.newRecoveryCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 2000);
    } catch {
      /* ignore */
    }
  }

  protected toggleSaved(): void {
    this.recoverySaved.update((v) => !v);
  }

  protected goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
