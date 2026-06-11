import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { I18nService } from '../../../core/services/i18n';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const conf = group.get('newPasswordConfirm')?.value;
  return pw && conf && pw !== conf ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset',
  imports: [ReactiveFormsModule],
  templateUrl: './reset.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reset {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly lang = this.i18n.lang;
  protected readonly busy = signal(false);
  protected readonly formError = signal('');
  protected readonly success = signal(false);

  protected readonly form: FormGroup = this.fb.group(
    {
      newPassword: [
        '',
        { validators: [Validators.required, Validators.minLength(8)] },
      ],
      newPasswordConfirm: ['', { validators: [Validators.required] }],
    },
    { validators: [passwordsMatch] },
  );

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;

    this.formError.set('');
    this.busy.set(true);
    const result = await this.auth.applyNewPassword(this.form.value.newPassword);
    this.busy.set(false);

    if (!result.ok) {
      if (result.reason === 'invalid-token') {
        this.formError.set(this.i18n.t('reset.errors.invalidToken'));
      } else {
        this.formError.set(this.i18n.t('reset.errors.invalidFields'));
      }
      return;
    }

    this.success.set(true);
    setTimeout(() => this.router.navigateByUrl('/map'), 1500);
  }
}
