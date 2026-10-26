// A reported claim, parsed strictly: what a dev agent (through `afterlife report`) says its change will move. Unknown keys,
// an unknown target kind, a missing title or a target without what it names are refused with the reason, never
// coerced. Afterlife fills `id` (sortable, ulid-like) and `at`; the agent's own figure is kept as `agentValue` and is
// only ever displayed: the verdict is Afterlife's re-measure (vitals/measure).
import { randomBytes } from 'node:crypto';
import type { AdjustmentClaim, AdjustmentTargetKind, ProdSignal, ProjectConfig } from '@/schemas/vitals';

export const TARGET_KINDS: readonly AdjustmentTargetKind[] = ['ci-stage', 'ci-run', 'local-metric', 'prod-signal'];
export const PROD_SIGNALS: readonly ProdSignal[] = ['requests', 'failed-rate', 'p95-ms', 'exceptions', 'availability'];

const KEYS = ['type', 'by', 'title', 'target', 'direction', 'expectedPct', 'ref', 'agentValue'];
const TARGET_KEYS = ['kind', 'variant', 'stage', 'metric', 'signal'];
const REF_KEYS = ['branch', 'sha', 'mr'];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const ONE_LINE = /^[^\r\n]{1,200}$/;
const NAME = /^[^\r\n]{1,80}$/;
const SHA = /^[0-9a-f]{7,40}$/i;
const BRANCH = /^[A-Za-z0-9._/-]{1,200}$/;
const MR = /^[!#]?\d{1,9}$/;

export type ClaimParse = { ok: true; claim: AdjustmentClaim } | { ok: false; reason: string };
const no = (reason: string): ClaimParse => ({ ok: false, reason });
const extra = (o: Rec, keys: readonly string[]): string[] => Object.keys(o).filter((k) => !keys.includes(k));

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 10 characters of milliseconds then 16 random ones, Crockford base32: ids sort as they were made. */
export function claimId(now: Date = new Date(), rand: Buffer = randomBytes(16)): string {
  let t = now.getTime();
  let time = '';
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  return time + [...rand].map((b) => CROCKFORD[b % 32]).join('');
}

function target(v: unknown, cfg?: ProjectConfig): AdjustmentClaim['target'] | string {
  if (!isRec(v)) return 'target must be an object {kind, ...}';
  const bad = extra(v, TARGET_KEYS);
  if (bad.length) return `target has unknown key(s) ${bad.join(', ')}`;
  const kind = TARGET_KINDS.find((k) => k === v.kind);
  if (!kind) return `target.kind must be one of ${TARGET_KINDS.join(', ')}`;
  for (const k of ['variant', 'stage', 'metric'] as const) if (v[k] !== undefined && (typeof v[k] !== 'string' || !NAME.test(v[k] as string))) return `target.${k} must be a one-line name`;
  const t: AdjustmentClaim['target'] = { kind };
  if (typeof v.variant === 'string') t.variant = v.variant;
  if (typeof v.stage === 'string') t.stage = v.stage;
  if (typeof v.metric === 'string') t.metric = v.metric;
  if (v.signal !== undefined) {
    const s = PROD_SIGNALS.find((x) => x === v.signal);
    if (!s) return `target.signal must be one of ${PROD_SIGNALS.join(', ')}`;
    t.signal = s;
  }
  if (kind === 'ci-stage' && !t.stage) return 'a ci-stage target names its stage (target.stage, as the pipeline shows it: "Run Tests")';
  if ((kind === 'ci-stage' || kind === 'ci-run') && !t.variant) return `a ${kind} target names its variant (target.variant: ${cfg?.ci.variants.map((r) => r.id).join(', ') || 'see the project'})`;
  if (kind === 'local-metric' && !t.metric) return 'a local-metric target names its metric (target.metric)';
  if (kind === 'prod-signal' && !t.signal) return 'a prod-signal target names its signal (target.signal)';
  if (cfg && t.variant && !cfg.ci.variants.some((r) => r.id === t.variant)) return `variant ${t.variant} is not one of ${cfg.slug}'s: ${cfg.ci.variants.map((r) => r.id).join(', ') || 'none'}`;
  return t;
}

function ref(v: unknown): AdjustmentClaim['ref'] | string {
  if (!isRec(v)) return 'ref must be an object {branch?, sha?, mr?}';
  const bad = extra(v, REF_KEYS);
  if (bad.length) return `ref has unknown key(s) ${bad.join(', ')}`;
  const r: AdjustmentClaim['ref'] = {};
  if (v.branch !== undefined) { if (typeof v.branch !== 'string' || !BRANCH.test(v.branch)) return 'ref.branch must be a branch name'; r.branch = v.branch; }
  if (v.sha !== undefined) { if (typeof v.sha !== 'string' || !SHA.test(v.sha)) return 'ref.sha must be 7 to 40 hex digits'; r.sha = v.sha.toLowerCase(); }
  if (v.mr !== undefined) { if (typeof v.mr !== 'string' || !MR.test(v.mr)) return 'ref.mr must be an MR or PR number ("!42", "#42", "42")'; r.mr = v.mr; }
  if (!r.branch && !r.sha) return 'ref names the change: ref.branch or ref.sha (both is best)';
  return r;
}

/** The claim as stored, or why not. `cfg` (the project) checks the variant against its rules. */
export function parseClaim(raw: unknown, o: { now?: Date; cfg?: ProjectConfig; id?: string } = {}): ClaimParse {
  if (!isRec(raw)) return no('the claim is not a JSON object');
  if (raw.id !== undefined || raw.at !== undefined) return no('id and at are Afterlife\'s to fill: leave them out');
  const bad = extra(raw, KEYS);
  if (bad.length) return no(`unknown key(s) ${bad.join(', ')}; a claim has ${KEYS.join(', ')}`);
  if (raw.type !== undefined && raw.type !== 'claim') return no('type, when given, is "claim"');
  if (typeof raw.title !== 'string' || !ONE_LINE.test(raw.title.trim())) return no('title is required: one line of at most 200 characters');
  const by = raw.by === undefined ? 'agent' : raw.by;
  if (by !== 'agent' && by !== 'person') return no('by must be agent or person');
  if (raw.direction !== 'down' && raw.direction !== 'up') return no('direction must be down or up');
  const t = target(raw.target, o.cfg);
  if (typeof t === 'string') return no(t);
  const r = ref(raw.ref);
  if (typeof r === 'string') return no(r);
  const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (raw.expectedPct !== undefined && (!fin(raw.expectedPct) || (raw.expectedPct as number) < 0 || (raw.expectedPct as number) > 100)) return no('expectedPct is a number from 0 to 100 (the size of the move; direction says which way)');
  if (raw.agentValue !== undefined && !fin(raw.agentValue)) return no('agentValue must be a number');
  const now = o.now ?? new Date();
  const claim: AdjustmentClaim = { type: 'claim', id: o.id ?? claimId(now), at: now.toISOString(), by, title: raw.title.trim(), target: t, direction: raw.direction, ref: r };
  if (raw.expectedPct !== undefined) claim.expectedPct = raw.expectedPct as number;
  if (raw.agentValue !== undefined) claim.agentValue = raw.agentValue as number;
  return { ok: true, claim };
}
