import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  Signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { PublicUser, Session, User } from '../models/user';
import { generateSalt, hashPassword } from '../utils/password-hash';
import {
  generateRecoveryCode,
  hashRecoveryCode,
} from '../utils/recovery-code';

const SESSION_KEY = 'grandtour.session.v1';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const BANDAI_RE = /^[0-9]{8,12}$/;

const USERS_URL = `${API_BASE_URL}/users`;

export type RegisterResult =
  | { ok: true; user: User; recoveryCode: string }
  | { ok: false; reason: 'username-taken' | 'email-taken' | 'invalid-fields' };

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'invalid-credentials' };

export type ResetResult =
  | { ok: true; recoveryCode: string }
  | { ok: false; reason: 'invalid-recovery' | 'invalid-fields' };

export type UpdateProfileResult =
  | { ok: true; user: PublicUser }
  | {
      ok: false;
      reason: 'not-authenticated' | 'username-taken' | 'email-taken' | 'invalid-fields';
    };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _session = signal<Session | null>(this.readSession());
  private readonly _currentUser = signal<PublicUser | null>(null);

  readonly session: Signal<Session | null> = this._session.asReadonly();
  readonly currentUserId: Signal<string | null> = computed(
    () => this._session()?.userId ?? null,
  );
  readonly currentUser: Signal<PublicUser | null> =
    this._currentUser.asReadonly();

  constructor() {
    effect(async () => {
      const userId = this.currentUserId();
      if (!userId) {
        this._currentUser.set(null);
        return;
      }
      const user = await this.fetchUserById(userId);
      this._currentUser.set(user ? stripUser(user) : null);
    });
  }

  async register(input: {
    username: string;
    email: string;
    password: string;
    bandaiTcgId?: string;
    remember?: boolean;
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

    if (await this.usernameExists(username)) {
      return { ok: false, reason: 'username-taken' };
    }
    if (await this.emailExists(email)) {
      return { ok: false, reason: 'email-taken' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = await hashRecoveryCode(recoveryCode, salt);

    const draft = {
      username,
      email,
      passwordHash,
      salt,
      recoveryCodeHash,
      recoveryCodeUpdatedAt: Date.now(),
      ...(bandaiTcgId ? { bandaiTcgId } : {}),
      createdAt: Date.now(),
    };

    const created = await firstValueFrom(this.http.post<User>(USERS_URL, draft));
    this.openSession(
      { userId: created.id, username: created.username },
      input.remember ?? true,
    );
    return { ok: true, user: created, recoveryCode };
  }

  async login(input: {
    usernameOrEmail: string;
    password: string;
    remember?: boolean;
  }): Promise<LoginResult> {
    const id = input.usernameOrEmail.trim().toLowerCase();
    if (!id || !input.password) {
      return { ok: false, reason: 'invalid-credentials' };
    }
    const user = await this.findUserByIdentifier(id);
    if (!user) return { ok: false, reason: 'invalid-credentials' };

    const hash = await hashPassword(input.password, user.salt);
    if (hash !== user.passwordHash) {
      return { ok: false, reason: 'invalid-credentials' };
    }
    const session: Session = { userId: user.id, username: user.username };
    this.openSession(session, input.remember ?? true);
    return { ok: true, session };
  }

  async resetPassword(input: {
    usernameOrEmail: string;
    recoveryCode: string;
    newPassword: string;
  }): Promise<ResetResult> {
    const id = input.usernameOrEmail.trim().toLowerCase();
    if (!id || !input.recoveryCode || input.newPassword.length < 8) {
      return { ok: false, reason: 'invalid-fields' };
    }

    const user = await this.findUserByIdentifier(id);
    if (!user) return { ok: false, reason: 'invalid-recovery' };

    const codeHash = await hashRecoveryCode(input.recoveryCode, user.salt);
    if (codeHash !== user.recoveryCodeHash) {
      return { ok: false, reason: 'invalid-recovery' };
    }

    const newPasswordHash = await hashPassword(input.newPassword, user.salt);
    const newRecoveryCode = generateRecoveryCode();
    const newRecoveryHash = await hashRecoveryCode(newRecoveryCode, user.salt);

    await firstValueFrom(
      this.http.patch(`${USERS_URL}/${user.id}`, {
        passwordHash: newPasswordHash,
        recoveryCodeHash: newRecoveryHash,
        recoveryCodeUpdatedAt: Date.now(),
      }),
    );

    return { ok: true, recoveryCode: newRecoveryCode };
  }

  async updateProfile(patch: {
    username?: string;
    email?: string;
    bandaiTcgId?: string;
  }): Promise<UpdateProfileResult> {
    const session = this._session();
    if (!session) return { ok: false, reason: 'not-authenticated' };

    const current = await this.fetchUserById(session.userId);
    if (!current) return { ok: false, reason: 'not-authenticated' };

    const username = (patch.username ?? current.username).trim();
    const email = (patch.email ?? current.email).trim();
    const bandaiRaw =
      patch.bandaiTcgId !== undefined
        ? patch.bandaiTcgId
        : current.bandaiTcgId ?? '';
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

    if (
      username.toLowerCase() !== current.username.toLowerCase() &&
      (await this.usernameExists(username, current.id))
    ) {
      return { ok: false, reason: 'username-taken' };
    }
    if (
      email.toLowerCase() !== current.email.toLowerCase() &&
      (await this.emailExists(email, current.id))
    ) {
      return { ok: false, reason: 'email-taken' };
    }

    const updated: User = {
      ...current,
      username,
      email,
      bandaiTcgId: bandaiTcgId || undefined,
    };
    await firstValueFrom(
      this.http.patch(`${USERS_URL}/${current.id}`, {
        username,
        email,
        bandaiTcgId: bandaiTcgId || null,
      }),
    );

    if (username !== session.username) {
      this.openSession({ ...session, username }, this.isRemembered());
    }
    this._currentUser.set(stripUser(updated));

    return { ok: true, user: stripUser(updated) };
  }

  async deleteAccount(): Promise<boolean> {
    const session = this._session();
    if (!session) return false;
    await this.cascadeDelete(session.userId);
    await firstValueFrom(this.http.delete(`${USERS_URL}/${session.userId}`));
    this.logout();
    return true;
  }

  logout(): void {
    this._session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }

  private async cascadeDelete(userId: string): Promise<void> {
    const collections = ['registrations', 'results', 'expenses'] as const;
    for (const col of collections) {
      const rows = await firstValueFrom(
        this.http.get<{ id: string }[]>(`${API_BASE_URL}/${col}`, {
          params: { userId },
        }),
      );
      for (const row of rows) {
        await firstValueFrom(
          this.http.delete(`${API_BASE_URL}/${col}/${row.id}`),
        );
      }
    }
  }

  private async fetchUserById(id: string): Promise<User | null> {
    try {
      return await firstValueFrom(this.http.get<User>(`${USERS_URL}/${id}`));
    } catch {
      return null;
    }
  }

  private async findUserByIdentifier(idLower: string): Promise<User | null> {
    // Try by username (server filter is case-sensitive, we normalize)
    const all = await firstValueFrom(this.http.get<User[]>(USERS_URL));
    return (
      all.find(
        (u) =>
          u.username.toLowerCase() === idLower ||
          u.email.toLowerCase() === idLower,
      ) ?? null
    );
  }

  private async usernameExists(
    username: string,
    excludeId?: string,
  ): Promise<boolean> {
    const all = await firstValueFrom(this.http.get<User[]>(USERS_URL));
    const target = username.toLowerCase();
    return all.some(
      (u) =>
        u.username.toLowerCase() === target &&
        (excludeId === undefined || u.id !== excludeId),
    );
  }

  private async emailExists(
    email: string,
    excludeId?: string,
  ): Promise<boolean> {
    const all = await firstValueFrom(this.http.get<User[]>(USERS_URL));
    const target = email.toLowerCase();
    return all.some(
      (u) =>
        u.email.toLowerCase() === target &&
        (excludeId === undefined || u.id !== excludeId),
    );
  }

  private isRemembered(): boolean {
    try {
      return localStorage.getItem(SESSION_KEY) !== null;
    } catch {
      return false;
    }
  }

  private openSession(session: Session, remember: boolean): void {
    this._session.set(session);
    const payload = JSON.stringify(session);
    try {
      if (remember) {
        localStorage.setItem(SESSION_KEY, payload);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, payload);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  private readSession(): Session | null {
    try {
      const raw =
        localStorage.getItem(SESSION_KEY) ??
        sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.userId === 'string' &&
        typeof parsed.username === 'string'
      ) {
        return parsed as Session;
      }
      return null;
    } catch {
      return null;
    }
  }
}

function stripUser(user: User): PublicUser {
  const { passwordHash, salt, recoveryCodeHash, ...rest } = user;
  return rest;
}
