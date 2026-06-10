import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

import { EMAILJS_CONFIG, emailjsConfigured } from '../config/emailjs.config';

export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'send-failed'; error?: unknown };

@Injectable({ providedIn: 'root' })
export class EmailService {
  async sendWelcome(input: {
    toEmail: string;
    username: string;
    recoveryCode: string;
  }): Promise<EmailSendResult> {
    if (!emailjsConfigured()) {
      return { ok: false, reason: 'not-configured' };
    }
    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.welcomeTemplateId,
        {
          to_email: input.toEmail,
          username: input.username,
          recovery_code: input.recoveryCode,
          app_name: 'Grand Tour',
        },
        { publicKey: EMAILJS_CONFIG.publicKey },
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: 'send-failed', error };
    }
  }
}
