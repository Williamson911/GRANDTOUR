import { Component, inject } from '@angular/core';

import { DataAvailabilityService } from '../../core/services/data-availability';
import { I18nService } from '../../core/services/i18n';

@Component({
  selector: 'app-server-down',
  imports: [],
  templateUrl: './server-down.html',
  styleUrl: './server-down.scss',
})
export class ServerDown {
  private readonly availability = inject(DataAvailabilityService);
  protected readonly i18n = inject(I18nService);
  protected readonly lang = this.i18n.lang;
  protected readonly online = this.availability.online;

  protected retry(): void {
    void this.availability.retry();
  }
}
