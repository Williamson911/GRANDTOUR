import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

import { PublicUser, Session } from '../models/user';
import { supabase } from './supabase';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const BANDAI_RE = /^[0-9]{8,12}$/;

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

interface ProfileRow {
  id: string;
  username: string;
  bandai_tcg_id: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<ProfileRow | null>(null);
  private readonly _ready = signal(false);

  readonly session: Signal<Session | null> = this._session.asReadonly();
  readonly ready: Signal<boolean> = this._ready.asReadonly();
  readonly currentUserId: Signal<string | null> = computed(
    () => this._session()?.userId ?? null,
  );
  readonly currentUser: Signal<PublicUser | null> = computed(() => {
    const s = this._session();
    const p = this._profile();
    if (!s || !p) return null;
    return {
      id: p.id,
      username: p.username,
      email: s.email,
      bandaiTcgId: p.bandai_tcg_id ?? undefined,
      createdAt: p.created_at,
    };
  });

  constructor() {
    // Bootstrap from any existing session, then subscribe.
    void supabase.auth.getSession().then(({ data }) => {
      this.applySession(data.session);
      this._ready.set(true);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      this.applySession(session);
    });

    // Whenever the user id changes, reload the profile.
    effect(async () => {
      const userId = this.currentUserId();
      if (!userId) {
        this._profile.set(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bandai_tcg_id, created_at')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('profile load failed', error);
        this._profile.set(null);
        return;
      }
      this._profile.set(data as ProfileRow | null);
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verified`,
        data: {
          username,
          ...(bandaiTcgId ? { bandai_tcg_id: bandaiTcgId } : {}),
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already')) {
        return { ok: false, reason: 'email-taken' };
      }
      if (msg.includes('profiles_username_key')) {
        return { ok: false, reason: 'username-taken' };
      }
      console.error('signup failed', error);
      return { ok: false, reason: 'invalid-fields' };
    }

    return { ok: true, awaitingConfirmation: true, email };
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<LoginResult> {
    const email = input.email.trim();
    if (!email || !input.password) {
      return { ok: false, reason: 'invalid-credentials' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return { ok: false, reason: 'email-not-confirmed' };
      }
      return { ok: false, reason: 'invalid-credentials' };
    }
    return { ok: true };
  }

  async resendConfirmation(email: string): Promise<{ ok: boolean }> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verified`,
      },
    });
    return { ok: !error };
  }

  async requestPasswordReset(email: string): Promise<ResetRequestResult> {
    // Always returns ok to avoid email enumeration.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return { ok: true };
  }

  async applyNewPassword(newPassword: string): Promise<ApplyPasswordResult> {
    if (newPassword.length < 8) {
      return { ok: false, reason: 'invalid-fields' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('expired') || msg.includes('invalid')) {
        return { ok: false, reason: 'invalid-token' };
      }
      return { ok: false, reason: 'invalid-fields' };
    }
    return { ok: true };
  }

  async updateProfile(patch: {
    username?: string;
    email?: string;
    bandaiTcgId?: string;
  }): Promise<UpdateProfileResult> {
    const session = this._session();
    const profile = this._profile();
    if (!session || !profile) return { ok: false, reason: 'not-authenticated' };

    const username = (patch.username ?? profile.username).trim();
    const email = (patch.email ?? session.email).trim();
    const bandaiRaw =
      patch.bandaiTcgId !== undefined
        ? patch.bandaiTcgId
        : profile.bandai_tcg_id ?? '';
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

    // Update profile row (username + bandai)
    const profileChanged =
      username !== profile.username ||
      (bandaiTcgId || null) !== (profile.bandai_tcg_id ?? null);
    if (profileChanged) {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bandai_tcg_id: bandaiTcgId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('profiles_username_key')) {
          return { ok: false, reason: 'username-taken' };
        }
        console.error('profile update failed', error);
        return { ok: false, reason: 'invalid-fields' };
      }
    }

    // Update email separately via Supabase Auth
    if (email !== session.email) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already')) {
          return { ok: false, reason: 'email-taken' };
        }
        console.error('email update failed', error);
        return { ok: false, reason: 'invalid-fields' };
      }
    }

    // Re-fetch profile to get fresh state
    const { data } = await supabase
      .from('profiles')
      .select('id, username, bandai_tcg_id, created_at')
      .eq('id', profile.id)
      .maybeSingle();
    if (data) this._profile.set(data as ProfileRow);

    return {
      ok: true,
      user: {
        id: profile.id,
        username,
        email,
        bandaiTcgId: bandaiTcgId || undefined,
        createdAt: profile.created_at,
      },
    };
  }

  async deleteAccount(): Promise<boolean> {
    const session = this._session();
    if (!session) return false;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      console.error('delete account failed', error);
      return false;
    }
    await supabase.auth.signOut();
    return true;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  private applySession(supaSession: SupabaseSession | null): void {
    if (!supaSession?.user) {
      this._session.set(null);
      return;
    }
    this._session.set({
      userId: supaSession.user.id,
      email: supaSession.user.email ?? '',
    });
  }
}
