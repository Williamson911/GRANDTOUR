import { Component, inject } from '@angular/core';

import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly i18n = inject(I18nService);
  protected readonly lang = this.i18n.lang;
}
