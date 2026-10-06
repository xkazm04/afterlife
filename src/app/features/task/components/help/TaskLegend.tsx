import { Kbd } from '@/components/controls/Kbd';
import { Legend } from '@/components/overlays/popover/Legend';
import { HonestyChip } from '@/components/status/HonestyChip';
import { Chip } from '../Chip';
import styles from './TaskLegend.module.css';

const Tie = ({ color, dashed }: { color: string; dashed?: boolean }) => (
  <svg viewBox="0 0 22 10" style={{ width: 'calc(22px * var(--ui-scale))', height: 'calc(10px * var(--ui-scale))' }} aria-hidden="true">
    <path d="M1 5h20" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray={dashed ? '3 3' : undefined} />
  </svg>
);

const Untested = () => (
  <svg viewBox="0 0 18 18" style={{ width: 'calc(18px * var(--ui-scale))', height: 'calc(18px * var(--ui-scale))' }} aria-hidden="true">
    <circle cx="9" cy="9" r="7.5" fill="none" stroke="var(--unknown)" strokeDasharray="3 2" />
    <text x="9" y="9" dy="0.35em" textAnchor="middle" fill="var(--unknown)" style={{ font: '700 var(--t-small) var(--mono)' }}>
      ?
    </text>
  </svg>
);

/** The legend behind the status-bar "?": the tie lines, the struck term, the honesty marks and every key. */
export function TaskLegend() {
  return (
    <>
      <Legend
        rows={[
          [<Tie key="h" color="var(--ok)" />, 'Check holds for the claim'],
          [<Tie key="c" color="var(--fail)" />, 'Check contradicts the claim'],
          [<Tie key="u" color="var(--unknown)" dashed />, 'Unknown · a person decides'],
          [<Untested key="n" />, 'Untested claim · no weight'],
          [<span key="s" className={styles.struck}>x</span>, 'Struck term · not a pass'],
          [<Chip key="i" tone="invariant">inv</Chip>, 'Engine invariant · no claim asked'],
          [<HonestyChip key="d" kind="seeded">s</HonestyChip>, 'Seeded demo input'],
          [<HonestyChip key="a" kind="unknown">n/a</HonestyChip>, 'Link not reached'],
        ]}
      />
      <hr />
      <div className={styles.keys}>
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> walk · <Kbd>←</Kbd> <Kbd>→</Kbd> cross · <Kbd>[</Kbd> <Kbd>]</Kbd> task · <Kbd>f</Kbd> fail only · <Kbd>r</Kbd> replay ·{' '}
        <Kbd>w</Kbd> words · <Kbd>Esc</Kbd> clear · <Kbd>⌘I</Kbd> inspector
      </div>
    </>
  );
}
