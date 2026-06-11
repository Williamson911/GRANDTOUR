import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { EmailService } from '../../../core/services/email';
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

export type EmailStatus = 'sent' | 'not-configured' | 'send-failed' | null;

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
  private readonly emailService = inject(EmailService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly busy = signal(false);
  protected readonly formError = signal('');

  protected readonly createdUsername = signal<string | null>(null);
  protected readonly recoveryCode = signal<string | null>(null);
  protected readonly emailStatus = signal<EmailStatus>(null);
  protected readonly registeredEmail = signal<string>('');
  protected readonly recoverySaved = signal(false);
  protected readonly justCopied = signal(false);

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
      password: [
        '',
        {
          validators: [Validators.required, Validators.minLength(8)],
        },
      ],
      passwordConfirm: [
        '',
        {
          validators: [Validators.required],
        },
      ],
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

    if (!result.ok) {
      this.busy.set(false);
      if (result.reason === 'username-taken') {
        this.form.get('username')?.setErrors({ taken: true });
      } else if (result.reason === 'email-taken') {
        this.form.get('email')?.setErrors({ taken: true });
      } else {
        this.formError.set(this.i18n.t('register.errors.invalidFields'));
      }
      return;
    }

    this.recoveryCode.set(result.recoveryCode);
    this.createdUsername.set(result.user.username);
    this.registeredEmail.set(result.user.email);

    const emailResult = await this.emailService.sendWelcome({
      toEmail: result.user.email,
      username: result.user.username,
      recoveryCode: result.recoveryCode,
      lang: this.i18n.lang(),
    });
    this.busy.set(false);

    if (emailResult.ok) {
      this.emailStatus.set('sent');
    } else if (emailResult.reason === 'not-configured') {
      this.emailStatus.set('not-configured');
    } else {
      this.emailStatus.set('send-failed');
    }
  }

  protected async copyRecovery(): Promise<void> {
    const code = this.recoveryCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 2000);
    } catch {
      /* clipboard blocked — user copies manually */
    }
  }

  protected toggleSaved(): void {
    this.recoverySaved.update((v) => !v);
  }

  protected continueToApp(): void {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo') ?? '/map';
    this.router.navigateByUrl(returnTo);
  }
}
