// TierMark paints from --tc (the stale fade is color-mix(var(--tc) ...)). tokens.css sets --tc for the five tiers only,
// so a standing ("no record yet", "split") must set its own, or a stale row's mark mixes an undefined variable, the
// declaration drops, and the mark takes the row's bright text colour. Derived from TIER_META + STANDING_META, not a list.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STANDING_META, TIER_META } from '@/lib/tiers';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = strip(readFileSync(join(__dirname, '../../../styles/tokens.css'), 'utf8'));
const mark = strip(readFileSync(join(__dirname, '../TierMark.module.css'), 'utf8'));

/** Whether some rule whose selector names data-tier="value" declares --tc. */
const setsTc = (css: string, value: string): boolean =>
  [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].some(([, sel, body]) => sel!.includes(`[data-tier="${value}"]`) && /--tc\s*:/.test(body!));

describe('every data-tier TierMark draws has a --tc', () => {
  it.each([...Object.keys(TIER_META), ...Object.keys(STANDING_META)])('%s', (value) => {
    expect(setsTc(tokens, value) || setsTc(mark, value)).toBe(true);
  });

  it('control: a rule without --tc is not counted', () => {
    expect(setsTc('.mk[data-tier="x"] { color: red; }', 'x')).toBe(false);
    expect(setsTc('.mk[data-tier="x"] { --tc: red; }', 'x')).toBe(true);
  });
});
