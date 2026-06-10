import { Component, inject } from '@angular/core';

import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-budget',
  imports: [],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
})
export class Budget {
  protected readonly i18n = inject(I18nService);
  protected readonly lang = this.i18n.lang;
}
