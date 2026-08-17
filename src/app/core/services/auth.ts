import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PublicUser, Session } from '../models/user';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const BANDAI_RE = /^[0-9]{8,12}$/;
const TOKEN_KEY = 'gt_token';

export type RegisterResult =
  | { ok: true; awaitingConfirmation: true; email: string }
  | { ok: false; reason: 'username-taken' | 'email-taken' | 'invalid-fields' };

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid-credentials' | 'email-not-confirmed' };

export type ResetRequestResult = { ok: true };

export type ApplyPasswordResult =
  | { ok: true }
  | { ok: false; reason: 'invalid-token' | 'invalid-fields' };

export type UpdateProfileResult =
  | { ok: true; user: PublicUser }
  | {
      ok: false;
      reason: 'not-authenticated' | 'username-taken' | 'email-taken' | 'invalid-fields';
    };

interface JwtClaims {
  sub: string;
  id: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

interface MeResponse {
  id: string;
  username: string;
  email: string;
  bandaiTcgId: string | null;
  createdAt: string;
}

interface ProfileOverride {
  username: string;
  email: string;
  bandaiTcgId?: string;
  createdAt: string;
}

function decodeJwt(token: string): JwtClaims | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtClaims;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _token = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  );
  private readonly _profileOverride = signal<ProfileOverride | null>(null);

  readonly token: Signal<string | null> = this._token.asReadonly();

  private readonly claims: Signal<JwtClaims | null> = computed(() => {
    const token = this._token();
    if (!token) return null;
    const decoded = decodeJwt(token);
    if (!decoded || decoded.exp * 1000 <= Date.now()) return null;
    return decoded;
  });

  readonly session: Signal<Session | null> = computed(() => {
    const c = this.claims();
    if (!c) return null;
    return { userId: c.id, username: c.sub, email: c.email, roles: c.roles };
  });

  readonly currentUserId: Signal<string | null> = computed(
    () => this.session()?.userId ?? null,
  );

  readonly currentUser: Signal<PublicUser | null> = computed(() => {
    const s = this.session();
    if (!s) return null;
    const override = this._profileOverride();
    return {
      id: s.userId,
      username: override?.username ?? s.username,
      email: override?.email ?? s.email,
      bandaiTcgId: override?.bandaiTcgId,
      createdAt: override?.createdAt,
    };
  });

  readonly isAdmin: Signal<boolean> = computed(
    () => this.session()?.roles.includes('ROLE_ADMIN') ?? false,
  );

  constructor() {
    effect(async () => {
      const userId = this.currentUserId();
      if (!userId) {
        this._profileOverride.set(null);
        return;
      }
      try {
        const me = await firstValueFrom(
          this.http.get<MeResponse>(`${environment.apiUrl}/me`),
        );
        this._profileOverride.set({
          username: me.username,
          email: me.email,
          bandaiTcgId: me.bandaiTcgId ?? undefined,
          createdAt: me.createdAt,
        });
      } catch {
        this._profileOverride.set(null);
      }
    });
  }

  async register(input: {
    username: string;
    email: string;
    password: string;
    bandaiTcgId?: string;
  }): Promise<RegisterResult> {
    const username = input.username.trim();
    const email = input.email.trim();
    const password = input.password;
    const bandaiTcgId = (input.bandaiTcgId ?? '').replace(/[\s-]/g, '');

    if (
      username.length < 3 ||
      username.length > 20 ||
      !USERNAME_RE.test(username) ||
      !EMAIL_RE.test(email) ||
      password.length < 8 ||
      (bandaiTcgId !== '' && !BANDAI_RE.test(bandaiTcgId))
    ) {
      return { ok: false, reason: 'invalid-fields' };
    }

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, {
          username,
          email,
          password,
        }),
      );
      return { ok: true, awaitingConfirmation: true, email };
    } catch (err) {
      return { ok: false, reason: this.conflictReason(err) };
    }
  }

  private conflictReason(
    err: unknown,
  ): 'username-taken' | 'email-taken' | 'invalid-fields' {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const message = String(err.error?.error ?? '').toLowerCase();
      if (message.includes('username')) return 'username-taken';
      if (message.includes('email')) return 'email-taken';
    }
    return 'invalid-fields';
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const email = input.email.trim();
    if (!email || !input.password) {
      return { ok: false, reason: 'invalid-credentials' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, {
          email,
          password: input.password,
        }),
      );
      this.setToken(response.token);
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        return { ok: false, reason: 'email-not-confirmed' };
      }
      return { ok: false, reason: 'invalid-credentials' };
    }
  }

  async resendConfirmation(email: string): Promise<{ ok: boolean }> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/resend-confirmation`, {
          email: email.trim(),
        }),
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    // Always returns ok to avoid email enumeration.
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/forgot-password`, {
          email: email.trim(),
        }),
      );
    } catch {
      // swallow — see comment above.
    }
    return { ok: true };
  }

  async applyNewPassword(
    token: string,
    newPassword: string,
  ): Promise<ApplyPasswordResult> {
    if (newPassword.length < 8) {
      return { ok: false, reason: 'invalid-fields' };
    }
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/reset-password`, {
          token,
          newPassword,
        }),
      );
      return { ok: true };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        return { ok: false, reason: 'invalid-token' };
      }
      return { ok: false, reason: 'invalid-fields' };
    }
  }

  async updateProfile(patch: {
    username?: string;
    email?: string;
    bandaiTcgId?: string;
  }): Promise<UpdateProfileResult> {
    const current = this.currentUser();
    if (!current) return { ok: false, reason: 'not-authenticated' };

    const username = (patch.username ?? current.username).trim();
    const email = (patch.email ?? current.email).trim();
    const bandaiRaw =
      patch.bandaiTcgId !== undefined ? patch.bandaiTcgId : current.bandaiTcgId ?? '';
    const bandaiTcgId = bandaiRaw.replace(/[\s-]/g, '');

    if (
      username.length < 3 ||
      username.length > 20 ||
      !USERNAME_RE.test(username) ||
      !EMAIL_RE.test(email) ||
      (bandaiTcgId !== '' && !BANDAI_RE.test(bandaiTcgId))
    ) {
      return { ok: false, reason: 'invalid-fields' };
    }

    try {
      const response = await firstValueFrom(
        this.http.put<MeResponse>(`${environment.apiUrl}/profile`, {
          username,
          email,
          bandaiTcgId: bandaiTcgId || null,
        }),
      );
      this._profileOverride.set({
        username: response.username,
        email: response.email,
        bandaiTcgId: response.bandaiTcgId ?? undefined,
        createdAt: response.createdAt,
      });
      return {
        ok: true,
        user: {
          id: response.id,
          username: response.username,
          email: response.email,
          bandaiTcgId: response.bandaiTcgId ?? undefined,
          createdAt: response.createdAt,
        },
      };
    } catch (err) {
      const reason = this.conflictReason(err);
      if (reason === 'invalid-fields') return { ok: false, reason: 'invalid-fields' };
      return { ok: false, reason };
    }
  }

  async deleteAccount(): Promise<boolean> {
    if (!this.session()) return false;
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/account`));
      this.setToken(null);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  private setToken(token: string | null): void {
    this._token.set(token);
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}
