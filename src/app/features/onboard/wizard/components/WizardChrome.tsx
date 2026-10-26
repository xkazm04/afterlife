import { Legend } from '@/components/overlays/popover/Legend';
import type { ClaudeRepo } from '@/schemas/vitals';
import type { WizardState } from '../hooks/useWizard';
import { engineLine } from '../model/format';
import { checklist, tally } from '../model/lines';

/** The status bar: "12 repos · 1 onboarded · Grinex Portal: 9 of 14 confirmed · sonnet 5.5 · low · 11 s". */
export function WizardStatus({ repos, s }: { repos?: readonly ClaudeRepo[]; s: WizardState }) {
  const onboarded = repos?.filter((r) => r.onboarded).length;
  // repos absent: not read yet, a dash (never "0 repos")
  const head = repos ? `${repos.length} repo${repos.length === 1 ? '' : 's'} · ${onboarded} onboarded` : '— repos · — onboarded';
  const a = s.answer;
  if (s.phase === 'proposing') return <>{`${head} · proposing · ${s.elapsedS} s`}</>;
  if (!a) return <>{head}</>;
  const t = tally(checklist(a.proposal, s.results.map((r) => r?.result), s.running, a.ciFiles));
  return <>{`${head} · ${a.proposal.name}: ${t.saved} of ${t.total} confirmed · ${engineLine(a.engine, a.ms)}`}</>;
}

/** The "?" legend: the line states and the one rule. */
export function WizardLegend() {
  return (
    <Legend
      rows={[
        ['proposed', 'The model proposed it; no probe has run for it yet'],
        ['probing', 'Its probe is running now (git, az or glab, read-only)'],
        ['ok', 'A probe confirmed it: it is saved'],
        ['failed', 'Its probe failed or found something else: it is not saved; a lapsed login names its re-login command'],
        ['skipped', 'A local command: it runs only on your click'],
        ['never ran', 'A CI file in the repo with no registered pipeline behind it: nothing to time until it is registered'],
        ['your step', 'Only you decide it (turn on App Insights): the exact commands are shown first and run only on your click'],
        ['Save', 'Writes only the confirmed lines to Afterlife’s data folder, never into the repo'],
      ]}
    />
  );
}
