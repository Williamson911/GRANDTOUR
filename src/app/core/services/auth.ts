import { computed, Injectable, signal, Signal } from '@angular/core';

import { PublicUser, Session, User } from '../models/user';
import { generateSalt, hashPassword } from '../utils/password-hash';
import {
  generateRecoveryCode,
  hashRecoveryCode,
} from '../utils/recovery-code';

const USERS_KEY = 'grandtour.users.v1';
const SESSION_KEY = 'grandtour.session.v1';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const BANDAI_RE = /^[0-9]{8,12}$/;

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
  private readonly _session = signal<Session | null>(this.readSession());
  private readonly _usersVersion = signal(0);

  readonly session: Signal<Session | null> = this._session.asReadonly();
  readonly currentUserId: Signal<string | null> = computed(
    () => this._session()?.userId ?? null,
  );
  readonly currentUser: Signal<PublicUser | null> = computed(() => {
    this._usersVersion();
    const session = this._session();
    if (!session) return null;
    const user = this.readUsers().find((u) => u.id === session.userId);
    if (!user) return null;
    const { passwordHash, salt, recoveryCodeHash, ...rest } = user;
    return rest;
  });

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

    const users = this.readUsers();
    if (
      users.some((u) => u.username.toLowerCase() === username.toLowerCase())
    ) {
      return { ok: false, reason: 'username-taken' };
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, reason: 'email-taken' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = await hashRecoveryCode(recoveryCode, salt);

    const user: User = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      salt,
      recoveryCodeHash,
      recoveryCodeUpdatedAt: Date.now(),
      ...(bandaiTcgId ? { bandaiTcgId } : {}),
      createdAt: Date.now(),
    };

    this.writeUsers([...users, user]);
    this.openSession(
      { userId: user.id, username: user.username },
      input.remember ?? true,
    );
    return { ok: true, user, recoveryCode };
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
    const user = this.readUsers().find(
      (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
    );
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

    const users = this.readUsers();
    const idx = users.findIndex(
      (u) => u.username.toLowerCase() === id || u.email.toLowerCase() === id,
    );
    if (idx < 0) return { ok: false, reason: 'invalid-recovery' };

    const user = users[idx];
    const codeHash = await hashRecoveryCode(input.recoveryCode, user.salt);
    if (codeHash !== user.recoveryCodeHash) {
      return { ok: false, reason: 'invalid-recovery' };
    }

    const newPasswordHash = await hashPassword(input.newPassword, user.salt);
    const newRecoveryCode = generateRecoveryCode();
    const newRecoveryHash = await hashRecoveryCode(newRecoveryCode, user.salt);

    users[idx] = {
      ...user,
      passwordHash: newPasswordHash,
      recoveryCodeHash: newRecoveryHash,
      recoveryCodeUpdatedAt: Date.now(),
    };
    this.writeUsers(users);

    return { ok: true, recoveryCode: newRecoveryCode };
  }

  async updateProfile(patch: {
    username?: string;
    email?: string;
    bandaiTcgId?: string;
  }): Promise<UpdateProfileResult> {
    const session = this._session();
    if (!session) return { ok: false, reason: 'not-authenticated' };

    const users = this.readUsers();
    const idx = users.findIndex((u) => u.id === session.userId);
    if (idx < 0) return { ok: false, reason: 'not-authenticated' };

    const current = users[idx];
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
      users.some(
        (u) =>
          u.id !== current.id &&
          u.username.toLowerCase() === username.toLowerCase(),
      )
    ) {
      return { ok: false, reason: 'username-taken' };
    }
    if (
      email.toLowerCase() !== current.email.toLowerCase() &&
      users.some(
        (u) =>
          u.id !== current.id &&
          u.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      return { ok: false, reason: 'email-taken' };
    }

    const updated: User = {
      ...current,
      username,
      email,
      bandaiTcgId: bandaiTcgId || undefined,
    };
    users[idx] = updated;
    this.writeUsers(users);

    if (username !== session.username) {
      this.openSession({ ...session, username }, this.isRemembered());
    }

    const { passwordHash, salt, recoveryCodeHash, ...publicUser } = updated;
    return { ok: true, user: publicUser };
  }

  deleteAccount(): boolean {
    const session = this._session();
    if (!session) return false;
    const users = this.readUsers().filter((u) => u.id !== session.userId);
    this.writeUsers(users);
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

  private readUsers(): User[] {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: User[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      this._usersVersion.update((v) => v + 1);
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
