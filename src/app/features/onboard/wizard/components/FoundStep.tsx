import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { OnboardError } from '@/server/discover/wire';
import type { WizardState } from '../hooks/useWizard';
import { ENGINES, engineLine } from '../model/format';
import { checklist, tally } from '../model/lines';
import { ChecklistLine } from './ChecklistLine';
import styles from '../wizard.module.css';
import cl from './checklist.module.css';

function Proposing({ s }: { s: WizardState }) {
  const engine = ENGINES.find((e) => e.key === s.engine)?.label ?? s.engine;
  return (
    <div className={cl.proposing} aria-busy="true">
      <p className={styles.summary}>
        Proposing what to watch in <code>{s.picked}</code> · {engine} · {s.elapsedS} s
      </p>
      <div className={cl.skeleton} aria-hidden="true">
        {[86, 64, 92, 58, 74].map((w) => (
          <span key={w} style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/** What went wrong before any line was proposed, in the person's next step. */
function Failed({ error, onRerun }: { error: OnboardError; onRerun: () => void }) {
  if (error.code === 'claude-missing') {
    return (
      <div className={cl.problem} role="alert">
        <p className={styles.failText}>The claude binary was not found. {error.error}</p>
        <p className={styles.summary}>Install Claude Code, log in once, check it answers, then re-run:</p>
        <CommandBlock label="Check claude" commands={['claude --version']} />
        <Button onClick={onRerun}>Re-run</Button>
      </div>
    );
  }
  const head = error.code === 'invalid' ? 'The proposal was invalid, so nothing was proposed.' : error.code === 'bad-root' ? 'That path is not a git checkout.' : 'The proposal failed.';
  return (
    <div className={cl.problem} role="alert">
      <p className={styles.failText}>{head}</p>
      <p className={styles.summary}>{error.error}</p>
      {error.code !== 'bad-root' ? <Button onClick={onRerun}>Re-run</Button> : null}
    </div>
  );
}

/** Step 2: the proposal as a checklist grouped by Host, Components, Pipelines & variants and Cloud, each line streaming its probe. */
export function FoundStep({ s, onRerun, onCopy }: { s: WizardState; onRerun: () => void; onCopy: (command: string) => void }) {
  const a = s.answer;
  const groups = a ? checklist(a.proposal, s.results.map((r) => r?.result), s.running, a.ciFiles) : [];
  const t = tally(groups);
  return (
    <section className={styles.step} aria-label="Step 2: what Afterlife found">
      <h2 className={styles.h}>
        <span className={styles.n}>2</span> What Afterlife found <span className={styles.aux}>{a ? `${a.proposal.name} · ${t.saved} of ${t.total} confirmed` : ''}</span>
      </h2>
      {s.phase === 'proposing' ? <Proposing s={s} /> : null}
      {!a && s.phase === 'pick' && s.error ? <Failed error={s.error} onRerun={onRerun} /> : null}
      {!a && s.phase === 'pick' && !s.error ? <p className={styles.empty}>Pick a repo: a low-effort model proposes what to watch, and a probe checks every line.</p> : null}
      {groups.map((g) => (
        <div key={g.name} className={cl.group}>
          <h3 className={cl.gh}>{g.name}</h3>
          <ul className={cl.lines} aria-label={g.name}>
            {g.lines.map((l) => (
              <ChecklistLine key={l.id} line={l} onCopy={onCopy} />
            ))}
          </ul>
        </div>
      ))}
      {a ? (
        <p className={styles.footer} data-onboard="engine">
          {engineLine(a.engine, a.ms)}
          {a.dropped ? ` · ${a.dropped} proposed probe${a.dropped === 1 ? '' : 's'} dropped (not a probe Afterlife runs)` : ''}
        </p>
      ) : null}
    </section>
  );
}
