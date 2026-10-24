// The first project's ladder for scripts/build-demo.mjs: stages, tracks, action classes with their records, sources and
// trials, and the tier legend. Illustrative like every value in the demo.

// The published stage list (rules, 5 Oct 2026). "configure" replaced "deploy".
const stages = ['plan', 'create', 'verify', 'package', 'secure', 'release', 'configure', 'monitor', 'govern'];

const tracks = [
  { id: 'T1', key: 'patcher', name: 'Exploit-proof patcher', verb: 'Proves the exploit, then fixes it',
    stages: ['secure', 'verify', 'create'], armed: true, armedBy: '!7',
    classes: ['dep-bump.patch', 'code-fix.patch'], latest: { text: 'opened !41 · exploit test red → green', at: '14:12' },
    proof: { cls: 'exploit-test', status: 'pass' }, needs: null },
  { id: 'T2', key: 'cra', name: 'EU CRA autopilot', verb: 'Starts the 24 h clock and drafts the reports',
    stages: ['govern', 'release', 'monitor'], armed: true, armedBy: '!9',
    classes: ['report.draft', 'report.submit'], latest: { text: 'clock started · early warning due in 19 h 12 m', at: '13:58' },
    proof: { cls: 'linked-evidence', status: 'pass' }, needs: 'sign-off' },
  { id: 'T3', key: 'governor', name: 'Trust ladder governor', verb: 'Earns autonomy from proofs, removes it on the first failure',
    stages: ['govern', 'configure'], armed: true, armedBy: '!4',
    classes: ['tier.demote', 'tier.promote'], latest: { text: 'proposal: qa qa.file-bug S → H', at: '13:40' },
    proof: { cls: 'ledger', status: 'pass' }, needs: '1 proposal' },
  { id: 'T4', key: 'guardrail', name: 'Guardrail reviewer', verb: 'Reviews agent-authored MRs and blocks what it can quote',
    stages: ['secure', 'govern', 'create'], armed: true, armedBy: '!3',
    classes: ['guard.block'], latest: { text: 'blocked !44 · hidden instruction quoted', at: '14:21' },
    proof: { cls: 'cited-diff', status: 'pass' }, needs: null },
  { id: 'T5', key: 'medic', name: 'Pipeline medic', verb: 'Tells a flake from a real failure',
    stages: ['verify', 'monitor'], armed: true, armedBy: '!11',
    classes: ['pipeline.retry', 'test.quarantine'], latest: { text: 'retried 1 runner flake · left 1 real failure', at: '13:05' },
    proof: { cls: 'rerun-stats', status: 'pass' }, needs: null },
  { id: 'T6', key: 'maturity', name: 'Maturity autopilot', verb: 'Finds the next gap and opens the MR that closes it',
    stages: ['plan', 'configure', 'secure', 'verify'], armed: true, armedBy: '!5',
    classes: ['ci-config.change'], latest: { text: 'grid 6 → 7 of 9 stages with evidence', at: '14:02' },
    proof: { cls: 'score-delta', status: 'pass' }, needs: 'pick gaps' },
  { id: 'T7', key: 'qa', name: 'Exploratory QA', verb: 'Explores the review app and files bugs with screenshots',
    stages: ['verify', 'release'], armed: true, armedBy: '!13',
    classes: ['qa.file-bug'], latest: { text: 'validated staging · 1 bug filed on !41', at: '14:16' },
    proof: { cls: 'repro', status: 'pass' }, needs: null },
  { id: 'T8', key: 'gardener', name: 'Upgrade gardener', verb: 'Keeps dependencies and migrations current',
    stages: ['create', 'verify', 'package'], armed: true, armedBy: '!15',
    classes: ['patch-bump'], latest: { text: 'quarantined · guardrail high on !44', at: '14:20' },
    proof: { cls: 'bench-delta', status: 'blocked' }, needs: 're-admit?' },
];

// Tier per action class. ceiling = what the track was built at; tier = where it stands now.
const actionClasses = [
  { id: 'dep-bump.patch', track: 'T1', ceiling: 'hands_off', tier: 'hands_off', lease_days: 9, record: { accepted: 16, needed: 15, noEdit: 0.94, cleanDays: 14, reverts: 0 }, lastMove: 'promoted 5 d ago' },
  { id: 'code-fix.patch', track: 'T1', ceiling: 'supervised', tier: 'supervised', lease_days: null, record: { accepted: 6, needed: null, noEdit: 0.83, cleanDays: 9, reverts: 0 }, lastMove: 'no change' },
  { id: 'report.draft', track: 'T2', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: { accepted: 4, needed: 3, noEdit: 1, cleanDays: 12, reverts: 0 }, lastMove: 'promoted 9 d ago' },
  { id: 'report.submit', track: 'T2', ceiling: 'human_only', tier: 'human_only', lease_days: null, record: null, lastMove: 'never an agent' },
  { id: 'tier.demote', track: 'T3', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: null, lastMove: 'demoted patch-bump 4 min ago' },
  { id: 'tier.promote', track: 'T3', ceiling: 'human_only', tier: 'human_only', lease_days: null, record: null, lastMove: 'a person, via policy MR' },
  { id: 'guard.block', track: 'T4', ceiling: 'hands_off', tier: 'hands_off', lease_days: null, record: { accepted: 22, needed: 10, noEdit: 1, cleanDays: 14, reverts: 0 }, lastMove: 'promoted 11 d ago' },
  { id: 'pipeline.retry', track: 'T5', ceiling: 'hands_off', tier: 'hands_off', lease_days: 11, record: { accepted: 19, needed: 15, noEdit: 1, cleanDays: 14, reverts: 0 }, lastMove: 'promoted 3 d ago' },
  { id: 'test.quarantine', track: 'T5', ceiling: 'supervised', tier: 'supervised', lease_days: null, record: { accepted: 2, needed: null, noEdit: 1, cleanDays: 6, reverts: 0 }, lastMove: 'no change' },
  { id: 'ci-config.change', track: 'T6', ceiling: 'assisted', tier: 'assisted', lease_days: null, record: { accepted: 5, needed: null, noEdit: 0.8, cleanDays: 10, reverts: 0 }, lastMove: 'ceiling: changes what agents may do' },
  { id: 'qa.file-bug', track: 'T7', ceiling: 'hands_off', tier: 'supervised', lease_days: null, record: { accepted: 16, needed: 15, noEdit: 1, cleanDays: 14, reverts: 0 }, lastMove: 'record 16 / 15 · eligible' },
  { id: 'patch-bump', track: 'T8', ceiling: 'supervised', tier: 'quarantined', lease_days: null, record: { accepted: 7, needed: null, noEdit: 0.71, cleanDays: 0, reverts: 1 }, lastMove: '4 min ago · tripwire · guardrail_high' },
];

// Earned on gated work, illustrative like every value here (the demo has no ledger): per class with a record, the
// accepted outputs belay-apply's gate decided (record.gated) and the gate last seen deciding for its holder (gateSeen:
// the MR, the tier it decided at, when; the demo's day is 2026-10-06, "now" 14:22 UTC). A class that holds Hands-off or
// is eligible has every accepted output gated; code-fix.patch and patch-bump fall short, so the row reads unmet.
const GATE = {
  'dep-bump.patch': [16, 41, 'hands_off', '2026-10-06T09:29:00.000Z'],
  'code-fix.patch': [3, 39, 'supervised', '2026-10-05T16:10:00.000Z'],
  'report.draft': [4, 36, 'hands_off', '2026-10-05T11:20:00.000Z'],
  'guard.block': [22, 43, 'hands_off', '2026-10-06T13:15:00.000Z'],
  'pipeline.retry': [19, 40, 'hands_off', '2026-10-06T13:05:00.000Z'],
  'test.quarantine': [2, 38, 'supervised', '2026-10-04T15:40:00.000Z'],
  'ci-config.change': [5, 35, 'assisted', '2026-10-03T10:05:00.000Z'],
  'qa.file-bug': [16, 42, 'supervised', '2026-10-06T13:52:00.000Z'],
  'patch-bump': [5, 44, 'quarantined', '2026-10-06T14:18:00.000Z'],
};
for (const a of actionClasses) {
  const g = a.record ? GATE[a.id] : undefined;
  if (g) a.record.gated = g[0];
  a.gateSeen = g ? { iid: g[1], tierAtTime: g[2], at: g[3] } : null; // null: no gate seen (no record, or never an agent)
}

// The outputs behind each record's counts (src/lib/demo/sources.ts), illustrative like every value here and marked
// `demo`: per class with a record, its merged outputs (record.accepted), its reverted ones (record.reverts) and, where
// CLOSED says, a closed MR; merged without edits as record.noEdit states it (the oldest merges were edited) and gated as
// record.gated does (the newest merges were gated; the rest are missing their tier_decision). The fixture states no
// window, so every output is counted. The record's since is cleanDays before the demo's now (12 days for a class with a
// revert); the outputs are spread from it to an hour or so before now, and their iids are drawn in time order across classes from !101.
// src/lib/demo/agreement.test.ts totals them against the counters.
const DEMO_NOW_MS = Date.parse('2026-10-06T14:22:00.000Z');
const HOUR_MS = 3_600_000;
const CLOSED = { 'code-fix.patch': 1, 'ci-config.change': 1, 'patch-bump': 1 };
const drafts = [];
actionClasses.forEach((a, k) => {
  const r = a.record;
  if (!r) return;
  const since = DEMO_NOW_MS - ((r.reverts === 0 ? r.cleanDays : 12) * 24 + 3) * HOUR_MS;
  const kinds = Array(r.accepted).fill('merged');
  for (let i = 0; i < r.reverts; i++) kinds.splice(2, 0, 'reverted');
  for (let i = 0; i < (CLOSED[a.id] ?? 0); i++) kinds.splice(Math.floor(kinds.length / 2), 0, 'closed');
  const newest = DEMO_NOW_MS - HOUR_MS - k * 41 * 60_000; // each class's newest output a little apart
  const span = newest - since - HOUR_MS;
  const clean = Math.round(r.noEdit * r.accepted);
  let m = 0;
  const outputs = kinds.map((outcome, i) => {
    const at = Math.floor((newest - (span * i) / kinds.length) / 60_000) * 60_000;
    const merged = outcome === 'merged' ? m++ : -1;
    return { iid: 0, outcome, at, inWindow: true, edited: merged < 0 ? null : merged >= clean, gated: merged < 0 ? null : merged < r.gated };
  });
  drafts.push(...outputs);
  a.sources = { since: new Date(since).toISOString(), window: null, web: null, outputs, total: outputs.length, excluded: [], blocks: [], missing: [], demo: true };
});
drafts.sort((x, y) => x.at - y.at).forEach((o, i) => { o.iid = 101 + i; });
for (const a of actionClasses) {
  if (!a.sources) continue;
  for (const o of a.sources.outputs) o.at = new Date(o.at).toISOString();
  a.sources.missing = a.sources.outputs.filter((o) => o.gated === false).map((o) => ({ iid: o.iid, fact: 'tier_decision' }));
}

// The next rung run as a trial (src/schemas/trial.ts), illustrative like every value here and marked demo with the
// sources: a class below its ceiling whose rung above acts alone (supervised approves, hands_off merges) has every gated
// merge as a trial MR, its tier_decision stamped half an hour before the merge; merged without edits agreed, edited is a
// catch. record.trial totals the list (src/lib/demo/agreement.test.ts checks it).
// Ladder order, lowest rung first; the one copy (the trial block and the fleet clamp both read it).
const RANK = ['quarantined', 'assisted', 'supervised', 'hands_off'];
for (const a of actionClasses) {
  const next = RANK[RANK.indexOf(a.tier) + 1];
  if (!a.sources || !next || RANK.indexOf(next) > RANK.indexOf(a.ceiling) || next === 'assisted') continue;
  a.sources.trial = a.sources.outputs.filter((o) => o.gated === true).map((o) => ({
    iid: o.iid, tier: next, at: new Date(Date.parse(o.at) - 30 * 60_000).toISOString(), resolution: o.edited ? 'edited' : 'agreed',
  }));
  a.record.trial = { n: a.sources.trial.length, catches: a.sources.trial.filter((x) => x.resolution !== 'agreed').length };
}

const tiers = {
  assisted: { label: 'ASSISTED', means: 'a human triggers every step' },
  supervised: { label: 'SUPERVISED', means: 'agent acts, a human approves the outcome' },
  hands_off: { label: 'HANDS-OFF', means: 'acts alone inside the envelope, revocable' },
  quarantined: { label: 'QUARANTINED', means: 'read and comment only' },
  human_only: { label: 'HUMAN ONLY', means: 'never an agent' },
};

export { stages, tracks, actionClasses, RANK, tiers };
