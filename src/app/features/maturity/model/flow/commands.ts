import type { CommandLineParts } from '@/components/inspector/CommandBlock';
import type { Gap } from '../ctx';

/** One line of the exact commands Belay shows before it writes: code, an optional trailing note, or a comment. */
export type CommandLine = CommandLineParts;

/** The commands "Send as you" will run for one gap, in the order they run. Belay writes only on the click. */
export function commandLines(g: Gap): CommandLine[] {
  const x = g.x;
  if (x.kind === 'probe') {
    return [
      { note: '# reads the alert integration and alerts; writes nothing' },
      { code: `npx belay probe ${g.stage} --project ${x.repo} --read-only` },
    ];
  }
  const n = x.files.length;
  const issue = x.workItem.replace('#', '');
  return [
    { note: `# 1 · one commit, ${n} file action${n > 1 ? 's' : ''}, new branch, as you` },
    { code: `glab api --method POST "projects/${x.repo.replace('/', '%2F')}/repository/commits" \\` },
    { code: `  --input belay-gap-${g.id}.commit.json`, note: `# branch ${x.branch}` },
    { note: `# 2 · the MR, linked to work item ${x.workItem}` },
    { code: `glab mr create --repo ${x.repo} --source-branch ${x.branch} --target-branch main \\` },
    { code: `  --title "Maturity gap ${g.id}: ${g.title}" --label maturity::gap --related-issue ${issue}` },
  ];
}

/** The sheet title and the primary button: "Open 2 MRs as you", "Run probe", "Open 1 MR as you + probe". */
export function sendLabel(mrs: number, probes: number): string {
  const head = mrs ? `Open ${mrs} MR${mrs > 1 ? 's' : ''} as you` : 'Run probe';
  return head + (mrs && probes ? ' + probe' : '');
}

/** The "+N" additions in a gap's diff, across its files. */
export function addedLines(g: Gap): number {
  return g.x.files.reduce((a, f) => a + f.lines.filter((l) => l.startsWith('+')).length, 0);
}
