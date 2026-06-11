import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class DataAvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly _online = signal<boolean | null>(null);

  readonly online: Signal<boolean | null> = this._online.asReadonly();

  async probe(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(`${API_BASE_URL}/users`, { params: { _limit: '1' } }),
      );
      this._online.set(true);
    } catch {
      this._online.set(false);
    }
  }

  async retry(): Promise<void> {
    this._online.set(null);
    await this.probe();
  }
}
