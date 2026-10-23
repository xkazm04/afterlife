import { Legend } from '@/components/overlays/popover/Legend';
import { capsOf, type Keymap } from '@/lib/keyboard/keymap';
import { MATURITY_KEYMAP } from '../../model/keys/keymap';
import styles from './MaturityLegend.module.css';

const line = (cls: string, dashed?: boolean) => (
  <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
    <path className={`${styles.stroke} ${cls}`} d="M2 10L20 2" strokeDasharray={dashed ? '4 4' : undefined} />
  </svg>
);

const GLYPHS = {
  rope: line(styles.rope ?? ''),
  deep: line(styles.deep ?? ''),
  target: line(styles.target ?? '', true),
  chalk: (
    <svg width="22" height="12" aria-hidden="true">
      <path className={`${styles.stroke} ${styles.chalk}`} d="M5 7h12" />
    </svg>
  ),
  ring: (
    <svg width="22" height="14" aria-hidden="true">
      <circle className={styles.ring} cx="11" cy="7" r="5.5" />
    </svg>
  ),
  picked: <span className={styles.tag}>g1</span>,
  unknown: <span className={styles.qbox}>?</span>,
  tick: <span className={styles.tick}>✓</span>,
} as const;

type KeyId = typeof MATURITY_KEYMAP extends Keymap<infer I> ? I : never;
/** The legend's short word per keymap entry; the keys themselves come from the keymap, so a bound key is a named key. */
const WORD: Record<KeyId, string> = { move: 'stage', go: 'steps', pick: 'pick', mode: 'crag', rescan: 'rescan' };
const KEYS_LINE = MATURITY_KEYMAP.entries.map((e) => `${capsOf(e.keys).map((c) => (c.length === 1 ? c.toUpperCase() : c)).join(' ')} ${WORD[e.id]}`).join(' · ');

/** The "?" popover: what the crag's marks mean, and the four credit rules. */
export function MaturityLegend() {
  return (
    <>
      <Legend
        rows={[
          [GLYPHS.rope, 'Rope: rungs with evidence'],
          [GLYPHS.deep, 'Deep: R3 enforced or higher'],
          [GLYPHS.target, 'Target: next bolt, not earned'],
          [GLYPHS.chalk, 'Chalk d0: day 0 high point'],
          [GLYPHS.ring, 'Next bolt; a tag on it is a gap'],
          [GLYPHS.picked, 'Picked, waits for you'],
          [GLYPHS.unknown, 'Unknown, never zero'],
        ]}
      />
      <hr />
      <h4>Credit rules</h4>
      <Legend
        rows={[
          [GLYPHS.tick, 'Same engine before and after'],
          [GLYPHS.tick, 'Not detector-only'],
          [GLYPHS.tick, 'Exercised, not just configured'],
          [GLYPHS.tick, 'Outside the noise band'],
        ]}
      />
      <hr />
      <div className={styles.keys}>{KEYS_LINE}</div>
    </>
  );
}
