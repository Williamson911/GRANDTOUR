import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

import { EMAILJS_CONFIG, emailjsConfigured } from '../config/emailjs.config';
import { Lang } from './i18n';

export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'send-failed'; error?: unknown };

@Injectable({ providedIn: 'root' })
export class EmailService {
  async sendWelcome(input: {
    toEmail: string;
    username: string;
    recoveryCode: string;
    lang: Lang;
  }): Promise<EmailSendResult> {
    if (!emailjsConfigured()) {
      return { ok: false, reason: 'not-configured' };
    }
    const { subject, html } = renderWelcomeEmail(input);
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.welcomeTemplateId,
        {
          to_email: input.toEmail,
          welcome_subject: subject,
          welcome_body: html,
        },
        { publicKey: EMAILJS_CONFIG.publicKey },
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: 'send-failed', error };
    }
  }
}

interface WelcomeContent {
  title: string;
  greeting: string;
  intro: string;
  recoveryLabel: string;
  warning: string;
  ifNotYouNote: string;
}

const FR: WelcomeContent = {
  title: 'Bienvenue sur Grand Tour',
  greeting: 'Salut',
  intro:
    'Ton compte sur <strong>Grand Tour</strong> a bien été créé. Voici ton code de récupération à conserver précieusement :',
  recoveryLabel: 'Code de récupération',
  warning:
    '⚠ <strong>À conserver précieusement.</strong> C\'est le <strong>seul moyen</strong> de réinitialiser ton mot de passe si tu l\'oublies. Garde-le dans un endroit sûr (gestionnaire de mots de passe, fichier protégé, etc.).',
  ifNotYouNote:
    'Tu n\'as pas créé ce compte ? Ignore cet email — sans le mot de passe choisi à l\'inscription, personne ne peut y accéder.',
};

const EN: WelcomeContent = {
  title: 'Welcome to Grand Tour',
  greeting: 'Hi',
  intro:
    'Your account on <strong>Grand Tour</strong> has been created. Here is your recovery code — keep it safe:',
  recoveryLabel: 'Recovery code',
  warning:
    '⚠ <strong>Keep it safe.</strong> It is the <strong>only way</strong> to reset your password if you forget it. Store it somewhere secure (password manager, encrypted file, etc.).',
  ifNotYouNote:
    "You didn't create this account? Ignore this email — without the password chosen at signup, no one can access it.",
};

function renderWelcomeEmail(input: {
  username: string;
  recoveryCode: string;
  lang: Lang;
}): { subject: string; html: string } {
  const t = input.lang === 'en' ? EN : FR;
  const safeUsername = escapeHtml(input.username);
  const safeCode = escapeHtml(input.recoveryCode);

  const html = `<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; max-width: 560px; margin: 0 auto; color: #110E11;">
  <div style="background: #110E11; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <div style="font-size: 22px; font-weight: 700; color: #FFFFFC; letter-spacing: 0.5px;">${t.title}</div>
    <div style="font-size: 11px; color: #CFA30F; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px;">DBSCG EU Circuit</div>
  </div>
  <div style="background: #FFFFFC; padding: 24px; border: 1px solid #E5E1E3; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin: 0 0 12px;">${t.greeting} <strong>${safeUsername}</strong>,</p>
    <p style="font-size: 14px; margin: 0 0 16px; line-height: 1.5;">${t.intro}</p>
    <table role="presentation" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="border: 2px dashed #CFA30F; background: #FFF8E1; padding: 18px; border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.4px; color: #CFA30F; font-weight: 700; margin-bottom: 8px;">${t.recoveryLabel}</div>
          <div style="font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px; color: #110E11;">${safeCode}</div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%">
      <tr>
        <td style="background: rgba(198, 35, 56, 0.08); border-left: 3px solid #C62338; padding: 12px 14px; border-radius: 4px; font-size: 13px; line-height: 1.5;">${t.warning}</td>
      </tr>
    </table>
    <p style="font-size: 12px; color: #8A858A; margin: 20px 0 0; line-height: 1.5;">${t.ifNotYouNote}</p>
  </div>
  <div style="text-align: center; font-size: 11px; color: #8A858A; padding: 16px 0;">Grand Tour — DBSCG EU Circuit Tracker</div>
</div>`;

  return { subject: t.title, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
