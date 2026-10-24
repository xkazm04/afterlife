// The cross-project fixtures for scripts/build-demo.mjs: the named portfolio and the seeded ~180-project fleet.
import { RANK, actionClasses } from './classes.mjs';

// Cross-project state (L0): every project Belay watches in the group. The detailed fields above
// (tracks, actionClasses, tasks, ...) describe the first project, ledgerline, at its deepest level.
// tiers = number of action classes at each tier; stages = rung per stage in `stages` order (null = unknown).
const portfolio = {
  group: 'acme-lab', projectsWatched: 6, asOf: '14:22',
  projects: [
    { id: 'ledgerline', name: 'ledgerline', what: 'core banking API (demo bank)', state: 'watching', armed: 8,
      tiers: { hands_off: 5, supervised: 3, assisted: 1, quarantined: 1, human_only: 2 },
      proofs7d: { pass: 31, fail: 2, inconclusive: 0 }, demotions7d: 1, needsYou: 5,
      stages: [1, 2, 3, 2, 3, 2, 2, 1, 3], feed: { ageSec: 12, ok: true },
      env: { staging: 'rev 00042 · 14:16', production: 'rev 00042 · 14:18' }, craOpen: 1,
      last: { at: '14:21', track: 'T4', text: 'blocked !44 · hidden instruction quoted (seeded)' } },
    { id: 'ledgerline-web', name: 'ledgerline-web', what: 'customer web app', state: 'watching', armed: 7,
      tiers: { hands_off: 3, supervised: 4, assisted: 1, quarantined: 0, human_only: 2 },
      proofs7d: { pass: 18, fail: 1, inconclusive: 1 }, demotions7d: 0, needsYou: 1,
      stages: [1, 2, 2, 2, 2, 2, 1, 1, 2], feed: { ageSec: 14, ok: true },
      env: { staging: 'rev 00117 · 13:52', production: 'rev 00115 · yesterday' }, craOpen: 0,
      last: { at: '14:09', track: 'T7', text: 'QA filed 2 bugs on review app !88' } },
    { id: 'payments-gateway', name: 'payments-gateway', what: 'card and SEPA payments', state: 'watching', armed: 8,
      tiers: { hands_off: 4, supervised: 4, assisted: 2, quarantined: 0, human_only: 2 },
      proofs7d: { pass: 26, fail: 0, inconclusive: 2 }, demotions7d: 0, needsYou: 0,
      stages: [2, 3, 3, 3, 4, 3, 2, 2, 3], feed: { ageSec: 16, ok: true },
      env: { staging: 'rev 00310 · 12:40', production: 'rev 00309 · 11:02' }, craOpen: 0,
      last: { at: '13:47', track: 'T1', text: 'dependency bump proved and promoted to production' } },
    { id: 'fx-rates', name: 'fx-rates', what: 'exchange-rate service', state: 'setting-up', armed: 3,
      tiers: { hands_off: 0, supervised: 1, assisted: 4, quarantined: 0, human_only: 2 },
      proofs7d: { pass: 4, fail: 1, inconclusive: 0 }, demotions7d: 0, needsYou: 2,
      stages: [0, 1, 2, 1, 1, 0, 1, null, 1], feed: { ageSec: 19, ok: true },
      env: { staging: 'not yet', production: 'rev 00012 · 3 d ago' }, craOpen: 0,
      setupStep: 'step 10 of 14 · bootstrap MR waits for your merge',
      last: { at: '12:55', track: 'T6', text: 'gap MR opened: SAST + secret detection' } },
    { id: 'docs-portal', name: 'docs-portal', what: 'public developer docs', state: 'stale', armed: 4,
      tiers: { hands_off: 1, supervised: 2, assisted: 1, quarantined: 0, human_only: 2 },
      proofs7d: { pass: 6, fail: 0, inconclusive: 0 }, demotions7d: 0, needsYou: 1,
      stages: [1, 2, 2, 1, 1, 2, 1, null, 1], feed: { ageSec: 2820, ok: false, error: 'project token expired · last good poll 47 min ago' },
      env: { staging: 'unknown', production: 'unknown' }, craOpen: 0,
      last: { at: '13:35', track: 'T8', text: 'last seen: upgrade MR !19 merged' } },
    { id: 'legacy-batch', name: 'legacy-batch', what: 'nightly settlement jobs', state: 'not-set-up', armed: 0,
      tiers: { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 },
      proofs7d: null, demotions7d: null, needsYou: 0,
      stages: [null, null, null, null, null, null, null, null, null], feed: { ageSec: null, ok: null },
      env: { staging: 'unknown', production: 'unknown' }, craOpen: 0,
      last: null },
  ],
};

// Production-scale fleet for density work: ~180 projects in 7 subgroups, deterministic (seeded).
// The six named portfolio projects come first; the rest are generated. Per project: the tier of
// each of the 12 action classes (null = class not armed), so a project x class matrix is possible.
const CLASS_IDS = actionClasses.map((a) => a.id);
const HUMAN_ONLY = new Set(actionClasses.filter((a) => a.ceiling === 'human_only').map((a) => a.id)); // never an agent's
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const fleet = (() => {
  const rnd = seeded(20261006);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const groups = ['core-banking', 'payments', 'channels', 'risk', 'data', 'platform', 'internal-tools'];
  const nouns = ['ledger', 'accounts', 'cards', 'sepa', 'fx', 'kyc', 'aml', 'loans', 'statements', 'notifications', 'auth', 'gateway',
    'reporting', 'audit', 'pricing', 'onboarding', 'limits', 'disputes', 'treasury', 'rates', 'search', 'docs', 'billing', 'scheduler',
    'ingest', 'warehouse', 'ml-scoring', 'feature-store', 'mobile', 'web', 'partner-api', 'webhooks', 'config', 'secrets', 'runner-pool'];
  const suffixes = ['service', 'api', 'worker', 'web', 'batch', 'adapter', 'sync', 'ui', 'cli', 'lib'];
  const seen = new Set(portfolio.projects.map((p) => p.id));
  const projects = portfolio.projects.map((p, i) => ({ ...p, group: i < 3 ? 'core-banking' : i === 3 ? 'risk' : i === 4 ? 'internal-tools' : 'core-banking' }));
  while (projects.length < 184) {
    const id = `${pick(nouns)}-${pick(suffixes)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = rnd();
    const state = r < 0.04 ? 'not-set-up' : r < 0.09 ? 'stale' : r < 0.17 ? 'setting-up' : 'watching';
    const armed = state === 'not-set-up' ? 0 : state === 'setting-up' ? 1 + Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 4);
    const classTiers = Object.fromEntries(CLASS_IDS.map((c) => {
      if (HUMAN_ONLY.has(c)) return [c, state === 'not-set-up' ? null : 'human_only'];
      if (state === 'not-set-up' || rnd() > armed / 8) return [c, null];
      const maturity = state === 'setting-up' ? 0.25 : 0.7;
      let t = RANK[1 + Math.min(2, Math.floor(rnd() * 3 * maturity + rnd() * 1.2))];
      if (rnd() < 0.015) t = 'quarantined';
      return [c, t];
    }));
    const tiers = { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 };
    for (const t of Object.values(classTiers)) if (t) tiers[t]++;
    const pass = state === 'not-set-up' ? null : Math.floor(rnd() * 40);
    const fail = pass === null ? null : rnd() < 0.7 ? 0 : 1 + Math.floor(rnd() * 3);
    const needsYou = state === 'not-set-up' ? 0 : rnd() < 0.72 ? 0 : 1 + Math.floor(rnd() * (rnd() < 0.2 ? 6 : 2));
    const ageSec = state === 'not-set-up' ? null : state === 'stale' ? 900 + Math.floor(rnd() * 7200) : 5 + Math.floor(rnd() * 40);
    const stagesArr = Array.from({ length: 9 }, () => (state === 'not-set-up' ? null : rnd() < 0.05 ? null : Math.min(4, Math.floor(rnd() * (armed / 2 + 1)))));
    projects.push({
      id, name: id, group: pick(groups), what: '', state, armed, classTiers, tiers,
      proofs7d: pass === null ? null : { pass, fail, inconclusive: rnd() < 0.15 ? 1 : 0 },
      demotions7d: fail === null ? null : fail > 1 ? 1 : 0, needsYou, stages: stagesArr,
      feed: { ageSec, ok: state === 'not-set-up' ? null : state !== 'stale', ...(state === 'stale' ? { error: pick(['project token expired', 'API rate limited', '403 on /pipelines']) } : {}) },
      craOpen: state !== 'not-set-up' && rnd() < 0.02 ? 1 : 0,
    });
  }
  // The named six get a class map consistent with their tier counts (ledgerline mirrors actionClasses).
  for (const p of projects.slice(0, 6)) {
    if (p.id === 'ledgerline') { p.classTiers = Object.fromEntries(actionClasses.map((a) => [a.id, a.tier])); continue; }
    const pool = Object.entries(p.tiers).flatMap(([t, n]) => Array(n).fill(t));
    p.classTiers = Object.fromEntries(CLASS_IDS.map((c) => [c, HUMAN_ONLY.has(c) ? (p.armed ? 'human_only' : null) : null]));
    const free = CLASS_IDS.filter((c) => p.classTiers[c] === null);
    pool.filter((t) => t !== 'human_only').forEach((t, i) => { if (free[i]) p.classTiers[free[i]] = t; });
  }
  // No cell sits above its class ceiling (the gate would cap it): each is lowered to the ceiling, and each project's tier
  // counts are taken from its cells (demo.test.ts pins both).
  const rank = (t) => RANK.indexOf(t);
  for (const p of projects) {
    for (const [c, t] of Object.entries(p.classTiers)) {
      const ceil = actionClasses.find((a) => a.id === c)?.ceiling;
      if (t && t !== 'human_only' && ceil && ceil !== 'human_only' && rank(t) > rank(ceil)) p.classTiers[c] = ceil;
    }
    p.tiers = { hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 };
    for (const t of Object.values(p.classTiers)) if (t) p.tiers[t]++;
  }
  return { classes: CLASS_IDS, groups, projects };
})();

export { portfolio, fleet };
