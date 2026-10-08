// ledgerline's merge requests, notes and deployments, built from the demo dataset so that polling them reproduces what
// the demo shows. Two MRs carry the story (!41 merged and proved, !44 blocked by the guardrail); the rest are the
// week's other proofs, old enough to be counted but not to be read as tasks.
import { DEMO } from '@/lib/demo';
import type { ProofBlock } from '@/schemas/proof';
import type { Task } from '@/lib/demo/types';
import type { Rec } from '../../adapter/fields';
import { project, type ProjectData } from '../dataset';
import { ACCOUNT, DAY, GROUP_PATH, iso, LEDGERLINE_GID, MIN, SHA } from './ids';
import { guardrailNote, proofNote } from './notes';

const WEB = `https://gitlab.com/${GROUP_PATH}/core-banking/ledgerline`;
export const at = (anchor: Date, hhmm: string): string => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = new Date(anchor);
  d.setUTCHours(h, m, 0, 0);
  return d.toISOString();
};

export interface MrInput {
  iid: number; title: string; description: string; author: string; state: 'opened' | 'merged'; labels: string[]; sha: string;
  created: string; updated: string; merged?: string;
}

export function mr(i: MrInput): Rec {
  return {
    id: 500_000 + i.iid, iid: i.iid, project_id: LEDGERLINE_GID, title: i.title, description: i.description, state: i.state,
    draft: false, source_branch: `belay/mr-${i.iid}`, target_branch: 'main', author: { username: i.author }, labels: i.labels,
    web_url: `${WEB}/-/merge_requests/${i.iid}`, sha: i.sha, detailed_merge_status: i.state === 'merged' ? 'not_open' : 'mergeable',
    created_at: i.created, updated_at: i.updated, merged_at: i.merged ?? null, head_pipeline: null,
  };
}

export const note = (id: number, author: string, body: string, created: string): Rec => ({ id, body, author: { username: author }, system: false, created_at: created });

function proofBlock(t: Task, mrIid: number, headSha: string): ProofBlock {
  const p = t.proof;
  if (!p) throw new Error(`demo task ${t.id} has no proof`);
  return {
    schema: 'belay.proof/1', id: `${t.id}PROOF0000000000000000`.slice(0, 26), class: 'exploit-test',
    task: { flow: 'patcher', run_id: 'pipeline-9841', project_id: LEDGERLINE_GID, mr_iid: mrIid, head_sha: headSha, trailer: `Belay-Task: ${t.id}` },
    claims: p.claims.map((text, n) => ({ id: `c${n + 1}`, text })),
    // engine-shaped: claim_id is the claim the check answers, name is the check id, detail its text. Every fixture check
    // answers the first claim except the envelope, which answers none.
    checks: p.checks.map((c) => ({ claim_id: c.id === 'envelope' ? null : 'c1', name: c.id, ok: c.ok, detail: c.text, ref: c.ref })),
    evidence: p.checks.map((c) => ({ kind: 'job' as const, ref: c.ref })),
    verdict: 'pass', envelope: { files: 2, lines: 14, paths_touched: ['src/export/StatementExportController.kt', 'src/export/ExportPaths.kt'], within: true },
    engine: { version: p.engine.replace(/^proof-engine /, ''), sha256: p.digest.replace(/^sha256:/, '') },
  };
}

const task = (id: string): Task => {
  const t = DEMO.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`demo task ${id} is missing`);
  return t;
};

/** The week's other proofs: counted by their proof:: label, outside the task window so they are not read as tasks. */
function weekMrs(anchor: Date, pass: number, fail: number): Rec[] {
  return Array.from({ length: pass + fail }, (_, n) => {
    const iid = 5 + n; // !5 .. !37, below the two story MRs
    const when = iso(anchor, -(2 + (n % 5)) * DAY - n * MIN);
    return mr({
      iid, title: `chore(deps): bump package-${iid}`, description: `Belay-Task: 01J7${String(iid).padStart(2, '0')}\nBelay-Class: dep-bump.patch`,
      author: ACCOUNT.patcher, state: 'merged', labels: [n < pass ? 'proof::pass' : 'proof::fail', 'belay::tier::supervised'],
      sha: `${String(iid).padStart(2, '0')}`.repeat(20), created: when, updated: when, merged: when,
    });
  });
}

export function ledgerlineData(raw: Rec, anchor: Date): ProjectData {
  const t41 = task('01J8Q4');
  const t44 = task('01J8Q9');
  const counts = DEMO.fleet.projects.find((p) => p.id === 'ledgerline')?.proofs7d ?? { pass: 0, fail: 0, inconclusive: 0 };
  const mr41 = mr({
    iid: 41, title: t41.title, description: `${t41.agentWords ?? ''}\n\nBelay-Task: ${t41.id}\nBelay-Class: ${t41.cls}`, author: ACCOUNT.patcher,
    state: 'merged', labels: ['proof::pass', 'guardrail::pass', `belay::tier::${t41.tierAtTime}`], sha: SHA.mr41,
    created: at(anchor, '09:02'), updated: at(anchor, '09:52'), merged: at(anchor, '09:29'),
  });
  const mr44 = mr({
    iid: 44, title: t44.title, description: `Belay-Task: ${t44.id}\nBelay-Class: ${t44.cls}`, author: ACCOUNT.gardener, state: 'opened',
    labels: ['guardrail::block', `belay::tier::${t44.tierAtTime}`], sha: SHA.mr44, created: at(anchor, '14:10'), updated: at(anchor, '14:20'),
  });
  const finding = { rule: 'prompt-injection', severity: 'high' as const, file: '.gitlab-ci.yml', quote: t44.quote ?? '', explanation: t44.reason ?? '' };
  const dep = (id: number, iid: number, env: 'staging' | 'production', hhmm: string): Rec => ({
    id, iid, status: 'success', ref: 'main', sha: SHA.mr41, environment: { id: env === 'staging' ? 302 : 303, name: env },
    deployable: { id: 80_000 + id }, created_at: at(anchor, hhmm), updated_at: at(anchor, hhmm),
  });
  return project(raw, {
    mrs: [mr44, mr41, ...weekMrs(anchor, counts.pass - 1, counts.fail)],
    notes: {
      '41': [
        note(910_001, ACCOUNT.proof, proofNote(proofBlock(t41, 41, SHA.mr41)), at(anchor, '09:27')),
        note(910_003, ACCOUNT.guardrail, guardrailNote('pass', SHA.mr41, []), at(anchor, '09:28')), // as its guardrail::pass label says
      ],
      '44': [note(910_002, ACCOUNT.guardrail, guardrailNote('block', SHA.mr44, [finding]), at(anchor, '14:20'))],
    },
    environments: [
      { id: 302, name: 'staging', slug: 'staging', state: 'available', tier: 'staging', external_url: 'https://staging.ledgerline.example' },
      { id: 303, name: 'production', slug: 'production', state: 'available', tier: 'production', external_url: 'https://ledgerline.example' },
    ],
    deployments: [dep(4002, 2, 'production', '09:51'), dep(4001, 1, 'staging', '09:40')],
  });
}
