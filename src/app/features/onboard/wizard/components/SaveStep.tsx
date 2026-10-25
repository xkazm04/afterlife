import { Button } from '@/components/controls/Button';
import type { WizardState } from '../hooks/useWizard';
import { checklist, tally } from '../model/lines';
import { AfterSave } from './AfterSave';
import styles from '../wizard.module.css';

/** Step 3: Save keeps only the lines a probe confirmed, then Vitals collects from them; once saved, the skill install and
 * (a cloud without a component) Turn on App Insights, each the server's preview first. */
export function SaveStep({ s, onSave, onRerun }: { s: WizardState; onSave: () => void; onRerun: () => void }) {
  const a = s.answer;
  const groups = a ? checklist(a.proposal, s.results.map((r) => r?.result), s.running, a.ciFiles) : [];
  const t = a ? tally(groups) : { saved: 0, total: 0, failed: 0 };
  const appInsights = groups.some((g) => g.lines.some((l) => l.id === 'person:app-insights'));
  const ready = s.phase === 'review' || s.phase === 'saving';
  return (
    <section className={styles.step} aria-label="Step 3: save and collect">
      <h2 className={styles.h}>
        <span className={styles.n}>3</span> Save and collect
      </h2>
      {s.phase === 'saved' && s.slug ? (
        <div className={styles.saveRow}>
          <p className={styles.summary}>
            Saved as <code>{s.slug}</code>: {t.saved} confirmed line{t.saved === 1 ? '' : 's'}; nothing a probe did not confirm.
          </p>
          <Button variant="accent" href={`/vitals/${s.slug}`}>
            Open its Vitals
          </Button>
        </div>
      ) : (
        <div className={styles.saveRow}>
          <p className={styles.summary}>
            {!a
              ? 'Saves only what a probe confirmed, to Afterlife’s own data folder, never into the repo.'
              : !ready
                ? `Probing ${s.running === null ? '' : `${s.running + 1} of ${a.proposal.probes.length}`}…`
                : `${t.saved} of ${t.total} lines confirmed${t.failed ? `, ${t.failed} failed` : ''}. Only the ${t.saved} are saved; fix a login and Re-run to add the rest.`}
          </p>
          {a ? <Button onClick={onRerun} disabled={s.phase === 'saving'}>Re-run</Button> : null}
          <Button variant="primary" disabled={!ready || s.phase === 'saving' || !t.saved} onClick={onSave} title="Write <data>/projects/<slug>.yml with the confirmed lines">
            {s.phase === 'saving' ? 'Saving…' : 'Save and collect'}
          </Button>
        </div>
      )}
      {s.phase === 'saved' && s.slug ? <AfterSave slug={s.slug} appInsights={appInsights} /> : null}
      {s.error && a ? (
        <p className={styles.failText} role="alert">
          {s.error.error}
        </p>
      ) : null}
    </section>
  );
}
