import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { Stats } from '@/components/inspector/blocks/Stats';
import { Chip } from '@/components/status/chip/Chip';
import type { EstateProject } from '../../model/estate/estate';
import { MAX_TOTAL, summarize } from '../../model/replay';
import { VERDICT_WORD } from '../../model/words';
import styles from './estate.module.css';

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** One project in cycles: its totals, whether its history adds up, and every closed cycle with what it changed. */
export function EstateInspector({ project: p, deep }: { project: EstateProject | null; deep: string }) {
  if (!p) return <p className={styles.empty}>Select a project in cycles.</p>;
  const ok = p.drift.length === 0 && p.breaks === 0;
  return (
    <>
      <InspectorHeader
        title={p.name}
        sub={
          <span className={styles.sub}>
            <Chip compact tone={ok ? 'ok' : 'bad'}>{ok ? '✓ replays to its rungs' : `✗ off on ${p.drift.join(', ') || 'the chain'}`}</Chip>
            {p.group}
          </span>
        }
      />
      <InspectorSection title="Numbers">
        <Stats
          cells={[
            { n: p.sum.credited, label: 'credited', tone: 'ok' },
            { n: p.sum.missed, label: 'not earned' },
            { n: p.sum.regressed, label: 'drift caught' },
            { n: p.sum.net, label: 'net rungs', tone: 'accent' },
          ]}
        />
        <KeyValue
          rows={[
            ['in cycles since', p.today === 0 ? 'today' : `${p.today} days ago`],
            ['cycles closed', String(p.closed)],
            ['rungs held today', `${p.held} of ${MAX_TOTAL}${p.unknown ? ` · ${p.unknown} unknown` : ''}`],
          ]}
        />
      </InspectorSection>
      <InspectorSection title="Every cycle" aux={`${p.closed} closed`}>
        <ol className={styles.cycles}>
          {[...p.cycles].reverse().map((c) => (
            <li key={c.id}>
              <b>{c.id}</b> {c.theme} <span className={styles.net}>{signed(summarize(c).net)}</span>
              <ul>
                {c.changes.map((x, i) => (
                  <li key={i} data-verdict={x.verdict}>
                    {x.mr ?? x.kind} · {x.stage} R{x.from ?? '?'}→R{x.to} · {VERDICT_WORD[x.verdict]}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </InspectorSection>
      <InspectorSection title="Next">
        {p.id === deep ? (
          <Button variant="accent" href="/cycles">Open {p.name}’s cycles</Button>
        ) : (
          <p className={styles.note}>The grid, the designer and the report are {deep}’s in this demo; here the estate reads each project’s ledger.</p>
        )}
      </InspectorSection>
    </>
  );
}
