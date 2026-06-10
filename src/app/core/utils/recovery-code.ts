import { bytesToHex } from './password-hash';

const ALPHABET = 'BCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_SIZE = 4;
const GROUPS = 3;

export function generateRecoveryCode(): string {
  const total = GROUP_SIZE * GROUPS;
  const buf = new Uint8Array(total);
  crypto.getRandomValues(buf);

  const chars = Array.from(buf, (b) => ALPHABET[b % ALPHABET.length]);
  const groups: string[] = [];
  for (let i = 0; i < GROUPS; i++) {
    groups.push(chars.slice(i * GROUP_SIZE, (i + 1) * GROUP_SIZE).join(''));
  }
  return `GT-${groups.join('-')}`;
}

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function hashRecoveryCode(
  code: string,
  salt: string,
): Promise<string> {
  const normalized = normalizeRecoveryCode(code);
  const data = new TextEncoder().encode(salt + normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}
