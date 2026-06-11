import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly error = signal<'invalid-credentials' | 'email-not-confirmed' | ''>('');
  protected readonly busy = signal(false);
  protected readonly resendBusy = signal(false);
  protected readonly resendSent = signal(false);

  protected readonly form: FormGroup = this.fb.group({
    email: ['', { validators: [Validators.required, Validators.email] }],
    password: ['', { validators: [Validators.required] }],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.error.set('');
    this.resendSent.set(false);
    this.busy.set(true);
    const result = await this.auth.login({
      email: this.form.value.email,
      password: this.form.value.password,
    });
    this.busy.set(false);

    if (!result.ok) {
      this.error.set(result.reason);
      return;
    }
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo') ?? '/map';
    this.router.navigateByUrl(returnTo);
  }

  protected async resend(): Promise<void> {
    const email = this.form.value.email?.trim();
    if (!email || this.resendBusy()) return;
    this.resendBusy.set(true);
    await this.auth.resendConfirmation(email);
    this.resendBusy.set(false);
    this.resendSent.set(true);
  }
}
