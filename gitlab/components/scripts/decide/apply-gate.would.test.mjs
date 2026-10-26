// apply-gate stamps the next rung's shadow decision (would) on its tier_decision and never applies it; the stamp then
// survives ledger-append and the engine into the appended line. Split from apply-gate.test.mjs, which holds the other events.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, workdir } from '../testing/harness.mjs';

const dir = workdir('apply-gate-would');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const HEAD = 'a'.repeat(40);
const LEDGER = `projects/${encodeURIComponent('acme/belay-ledger')}`;
const ENV = { CI_PROJECT_URL: 'https://gitlab.example/acme/ledgerline' };
const write = (name, value) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify(value));
  return f;
};

describe("apply-gate: the next rung's shadow decision (would) is stamped, never applied", () => {
  /** apply-gate on a decision file, writing (a bot token) unless `dry`; returns its writes and the events it emitted. */
  const run = (name, decision, { dry = false } = {}) => {
    const emit = path.join(dir, `events-would-${name}`);
    const args = ['--mr', '7', '--sha', HEAD, '--decision', write(`decision-${name}.json`, decision), '--agent', 'ai-patcher-acme', '--class', 'code-fix.patch', '--emit-dir', emit, ...(dry ? ['--dry', '1'] : [])];
    const r = runScript(dir, 'decide/apply-gate.mjs', args, { env: { ...ENV, AFTERLIFE_BOT_TOKEN: 'bot' } });
    const events = fs.existsSync(emit) ? fs.readdirSync(emit).sort().map((f) => JSON.parse(fs.readFileSync(path.join(emit, f), 'utf8'))) : [];
    return { r, emit, events };
  };
  const WAIT = { decision: 'wait', tier: 'assisted', reasons: ['assisted: a Code Owner approves and merges, the gate does not act'] };

  it('stamps would on the tier_decision only; the writes are exactly those of the same decision without it', () => {
    const shadow = run('stamp', { ...WAIT, would: { tier: 'supervised', decision: 'approve' } });
    const plain = run('plain', WAIT);
    expect(shadow.r.code, shadow.r.stderr).toBe(0);
    expect(shadow.events.map((e) => [e.kind, e.would])).toEqual([['proof_verdict', undefined], ['tier_decision', { tier: 'supervised', decision: 'approve' }]]);
    expect('would' in plain.events[1]).toBe(false);
    // nothing applied from it: the same note and labels, and no approve or merge, as the decision without it
    expect(shadow.r.writes).toEqual(plain.r.writes);
    expect(shadow.r.writes.map((w) => [w.path, w.body.label])).toEqual([['mr note create', undefined], ['mr update', 'belay::tier::assisted']]);
  });

  it('a would that merges one rung up grants nothing at supervised beyond the approve; dry runs write nothing', () => {
    const approve = { decision: 'approve', tier: 'supervised', reasons: [] };
    const shadow = run('merge', { ...approve, would: { tier: 'hands_off', decision: 'merge' } });
    expect(shadow.r.writes.map((w) => w.path)).toEqual(run('approve', approve).r.writes.map((w) => w.path));
    expect(shadow.r.writes.some((w) => w.path === 'mr merge')).toBe(false);
    const dry = run('dry', { ...approve, would: { tier: 'hands_off', decision: 'merge' } }, { dry: true });
    expect([dry.r.code, dry.r.writes]).toEqual([0, []]);
    expect(dry.events.at(-1).would).toEqual({ tier: 'hands_off', decision: 'merge' });
  });

  it('refuses a would that is not the rung above, names no decision, or carries more', () => {
    for (const would of [{ tier: 'hands_off', decision: 'merge' }, { tier: 'supervised', decision: 'ship' }, { tier: 'supervised', decision: 'approve', x: 1 }, 'approve']) {
      expect(run('bad', { ...WAIT, would }, { dry: true }).r.code).toBe(2);
    }
  });

  it('would survives ledger-append and the engine into the appended line', { timeout: 120_000 }, () => {
    const { emit } = run('append', { ...WAIT, would: { tier: 'supervised', decision: 'approve' } }, { dry: true });
    const routes = {
      [`${LEDGER}/repository/files/events%2F1.jsonl`]: { __http: 404, message: '404 File Not Found' },
      [`POST ${LEDGER}/repository/commits`]: { reply: { id: 'f'.repeat(40) } },
    };
    const r = runScript(dir, 'decide/ledger-append.mjs', ['--events', emit, '--project', 'acme/belay-ledger'], { routes, env: { AFTERLIFE_BOT_TOKEN: 'bot' } });
    expect(r.code, r.stderr).toBe(0);
    const lines = r.writes.find((w) => w.path === `${LEDGER}/repository/commits`).body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.map((e) => [e.kind, e.tier_at_time, e.would])).toEqual([['proof_verdict', 'assisted', undefined], ['tier_decision', 'assisted', { tier: 'supervised', decision: 'approve' }]]);
  });
});
