/**
 * EmailJS configuration.
 *
 * To enable confirmation emails:
 * 1. Create a free account at https://www.emailjs.com/
 * 2. Add an Email Service (Gmail / Outlook / etc.) — copy the Service ID
 * 3. Create an Email Template using these dynamic fields:
 *      {{to_email}}      → recipient address
 *      {{username}}      → username of the new account
 *      {{recovery_code}} → recovery code (to save for password reset)
 *      {{app_name}}      → "Grand Tour"
 *    Copy the Template ID
 * 4. From Account → API Keys, copy your Public Key
 * 5. Paste the three values below
 *
 * The public key is safe to commit — EmailJS protects abuse with
 * domain restrictions and rate limits, not key secrecy.
 *
 * If any value is left empty, the EmailService silently no-ops and
 * the rest of the app keeps working (recovery code is still shown
 * on screen, so the user is not locked out).
 */
export const EMAILJS_CONFIG = {
  publicKey: 'ZDOrcqnQj6LxdlH62',
  serviceId: 'service_o3i8iyq',
  welcomeTemplateId: 'template_uvfhx4h',
};

export function emailjsConfigured(): boolean {
  return (
    !!EMAILJS_CONFIG.publicKey &&
    !!EMAILJS_CONFIG.serviceId &&
    !!EMAILJS_CONFIG.welcomeTemplateId
  );
}
