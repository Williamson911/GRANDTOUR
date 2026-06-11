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
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected readonly form: FormGroup = this.fb.group({
    usernameOrEmail: ['', { validators: [Validators.required] }],
    password: ['', { validators: [Validators.required] }],
    remember: [true],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.error.set('');
    this.busy.set(true);
    const emailSaisi = this.form.value.usernameOrEmail; // 1. On récupère la saisie de l'utilisateur

    const result = await this.auth.login({
      usernameOrEmail: emailSaisi,
      password: this.form.value.password,
      remember: !!this.form.value.remember,
    });
    this.busy.set(false);

    if (!result.ok) {
      this.error.set(this.i18n.t('login.error'));
      return;
    }
    localStorage.setItem('token', 'un-faux-jwt-token-pour-le-guard');
    localStorage.setItem('currentUserEmail', emailSaisi);

    const returnTo = this.route.snapshot.queryParamMap.get('returnTo') ?? '/map';
    this.router.navigateByUrl(returnTo);
  }
}
