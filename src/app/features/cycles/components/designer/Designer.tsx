import { Button } from '@/components/controls/Button';
import { Checkbox } from '@/components/controls/Checkbox';
import { rungLabel } from '../../model/replay';
import { designSummary, WIP_CAP, type Candidate, type Problem } from '../../model/design';
import styles from './design.module.css';

const GROUPS = [
  { source: 'proposal', title: 'Proposed', aux: 'drafted by the T6 autopilot, or carried from a cycle that did not earn it' },
  { source: 'next', title: 'Next rungs', aux: 'one per stage; T6 drafts the MR once you pick it' },
] as const;

/**
 * Design the next cycle: pick its changes from the candidates while the grid above previews the result. The rules are
 * checked as you pick (one change per stage, at most four, nothing on a stage the running cycle is lifting); a
 * design that breaks one cannot be saved.
 */
export function Designer({
  cycleId,
  candidates,
  picked,
  problems,
  onToggle,
  onSave,
  onCancel,
}: {
  cycleId: string;
  candidates: readonly Candidate[];
  picked: readonly Candidate[];
  problems: readonly Problem[];
  onToggle: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const sum = designSummary(picked);
  const ids = new Set(picked.map((c) => c.id));
  return (
    <section className={styles.designer} aria-label={`Design ${cycleId}`}>
      <header className={styles.head}>
        <h2>
          Design {cycleId} <span>the grid above previews it</span>
        </h2>
        <span className={styles.wip} data-over={picked.length > WIP_CAP || undefined}>
          {picked.length} / {WIP_CAP} changes
        </span>
      </header>
      {GROUPS.map((g) => (
        <div key={g.source} className={styles.group} role="group" aria-label={g.title}>
          <div className={styles.gh}>
            <b>{g.title}</b> <span>{g.aux}</span>
          </div>
          {candidates
            .filter((c) => c.source === g.source)
            .map((c) => (
              <div key={c.id} className={styles.row} data-blocked={c.blocked ? true : undefined} data-on={ids.has(c.id) || undefined}>
                <Checkbox checked={ids.has(c.id)} disabled={!!c.blocked && !ids.has(c.id)} label={c.title} onChange={() => onToggle(c.id)} />
                <span className={styles.stage}>{c.stage}</span>
                <span className={styles.mv}>
                  {rungLabel(c.from)} → R{c.to}
                </span>
                <span className={styles.what}>
                  <span className={styles.ttl}>{c.title}</span>
                  <span className={styles.why}>{c.blocked ?? c.why}</span>
                </span>
                <span className={styles.kind}>{c.kind === 'probe' ? 'probe · read only' : c.lines ? `+${c.lines}` : 'MR'}</span>
              </div>
            ))}
        </div>
      ))}
      <footer className={styles.foot}>
        <div className={styles.sum}>
          <b>{sum.reach > 0 ? `+${sum.reach}` : sum.reach} rungs in reach</b>
          <span>
            {sum.mrs} MR{sum.mrs === 1 ? '' : 's'} · {sum.probes} probe{sum.probes === 1 ? '' : 's'}
            {sum.lines ? ` · +${sum.lines} lines drafted` : ''}
            {sum.drafted ? ` · ${sum.drafted} still to draft` : ''}
          </span>
          {problems.length ? (
            <ul className={styles.problems}>
              {problems.map((p) => (
                <li key={p.rule + p.text}>{p.text}</li>
              ))}
            </ul>
          ) : (
            <span className={styles.ok}>✓ one change per stage · at most {WIP_CAP} · nothing on a moving stage · engine pinned</span>
          )}
        </div>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="accent" disabled={problems.length > 0} onClick={onSave}>
          Save {cycleId}
        </Button>
      </footer>
    </section>
  );
}
