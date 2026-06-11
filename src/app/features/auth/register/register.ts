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
  const pw = group.get('password')?.value;
  const conf = group.get('passwordConfirm')?.value;
  return pw && conf && pw !== conf ? { passwordsMismatch: true } : null;
}

function bandaiIdValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const raw: string = control.value ?? '';
  const stripped = raw.replace(/[\s-]/g, '');
  if (stripped === '') return null;
  return /^[0-9]{8,12}$/.test(stripped) ? null : { bandaiInvalid: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly awaitingEmail = signal<string | null>(null);
  protected readonly resendBusy = signal(false);
  protected readonly resendDone = signal(false);

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
        { validators: [Validators.required, Validators.email] },
      ],
      password: [
        '',
        { validators: [Validators.required, Validators.minLength(8)] },
      ],
      passwordConfirm: ['', { validators: [Validators.required] }],
      bandaiTcgId: ['', { validators: [bandaiIdValidator] }],
    },
    { validators: [passwordsMatch] },
  );

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.formError.set('');
    this.busy.set(true);
    const result = await this.auth.register({
      username: this.form.value.username,
      email: this.form.value.email,
      password: this.form.value.password,
      bandaiTcgId: this.form.value.bandaiTcgId || undefined,
    });
    this.busy.set(false);

    if (!result.ok) {
      if (result.reason === 'username-taken') {
        this.form.get('username')?.setErrors({ taken: true });
      } else if (result.reason === 'email-taken') {
        this.form.get('email')?.setErrors({ taken: true });
      } else {
        this.formError.set(this.i18n.t('register.errors.invalidFields'));
      }
      return;
    }

    this.awaitingEmail.set(result.email);
  }

  protected async resend(): Promise<void> {
    const email = this.awaitingEmail();
    if (!email || this.resendBusy()) return;
    this.resendBusy.set(true);
    await this.auth.resendConfirmation(email);
    this.resendBusy.set(false);
    this.resendDone.set(true);
  }

  protected backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
