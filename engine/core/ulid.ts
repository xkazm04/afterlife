// Minimal ULID (48-bit time + 80 bits of randomness, Crockford base32) for Proof Block ids.
import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(now: Date): string {
  let t = now.getTime();
  let time = '';
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  let rand = '';
  for (const b of randomBytes(16)) rand += ALPHABET[b % 32];
  return time + rand;
}
