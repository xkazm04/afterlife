// What belay-apply's two sweeps share: its config, the paired group's own projects, a fresh clone of belay-policy, and
// running the components' glue scripts against one target. Plain Node 20 plus `yaml` from the engine checkout's own
// node_modules (npm ci in the job's boot). Nothing here takes a value from a pipeline variable, a trigger or a webhook:
// the config is a file of this project's protected default branch, and every fact about a target is read from GitLab.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { apiAll, die, enc } from '../components/scripts/lib/lib.mjs';

export const GLUE = path.resolve(import.meta.dirname, '..', 'components', 'scripts');

/** Every value a sweep needs, from apply.json. A missing or malformed value stops the sweep before any read. */
export function loadConfig(file) {
  let c;
  try {
    c = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    die(`cannot read the config ${file}: ${e.message}`);
  }
  const PATH = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/;
  const bad = [];
  if (!PATH.test(c.group ?? '')) bad.push('group');
  if (!PATH.test(c.policy?.project ?? '')) bad.push('policy.project');
  if (!PATH.test(c.ledger?.project ?? '')) bad.push('ledger.project');
  if (!/^[A-Za-z0-9_.-]+$/.test(c.bot ?? '')) bad.push('bot (the username behind BELAY_BOT_TOKEN)');
  if (!c.targets || typeof c.targets !== 'object') bad.push('targets');
  for (const t of Object.keys(c.targets ?? {})) if (!PATH.test(t)) bad.push(`targets.${t}`);
  if (bad.length) die(`the config ${file} has no valid ${bad.join(', ')}`);
  return {
    group: c.group,
    policy: { project: c.policy.project, branch: c.policy.branch ?? 'main', writeMode: c.policy.write_mode ?? 'commit' },
    ledger: { project: c.ledger.project, branch: c.ledger.branch ?? 'main' },
    bot: c.bot,
    agentPrefix: c.agent_prefix ?? 'ai-',
    guardrailAuthors: c.guardrail_authors ?? `ai-guardrail-${c.group.split('/')[0]}`,
    medicAuthors: c.medic_authors ?? `ai-medic-${c.group.split('/')[0]}`,
    lookbackHours: Number(c.lookback_hours ?? 24),
    targets: c.targets,
  };
}

/**
 * The targets a sweep acts on: the config's targets that are projects of the paired group itself. GitLab lists projects
 * shared into the group as well; one whose path is not under the group's is skipped (F37's rule, as arm/plan.ts applies
 * it), and so is a configured target the group does not list at all.
 */
export function targetsOf(cfg, log) {
  const listed = apiAll(`groups/${enc(cfg.group)}/projects?include_subgroups=true&archived=false`, 20);
  const out = [];
  for (const want of Object.keys(cfg.targets)) {
    const p = listed.find((x) => x.path_with_namespace === want);
    if (!p) log(`skip ${want}: the group ${cfg.group} does not list it`);
    else if (!String(p.path_with_namespace).startsWith(`${cfg.group}/`)) log(`skip ${want}: it is shared into ${cfg.group} from elsewhere`);
    else out.push({ ...p, conf: cfg.targets[want] ?? {} });
  }
  for (const p of listed) {
    if (!(p.path_with_namespace in cfg.targets) && !String(p.path_with_namespace).startsWith(`${cfg.group}/`)) log(`skip ${p.path_with_namespace}: shared into ${cfg.group} from elsewhere`);
  }
  return out;
}

/**
 * A fresh clone of belay-policy into `dest`. `remote` is a URL or path (tests); in CI it is built here from CI_JOB_TOKEN,
 * which belay-policy's job token allowlist must grant to belay-apply. The token never reaches argv or .git/config.
 */
export function clonePolicy(cfg, remote, dest, depth = 300) {
  fs.rmSync(dest, { recursive: true, force: true });
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  const args = ['-c', 'core.autocrlf=false', 'clone', '-q', '--depth', String(depth), '--branch', cfg.policy.branch];
  let url = remote;
  if (!url) {
    const host = process.env.CI_SERVER_FQDN ?? die('CI_SERVER_FQDN is not set');
    url = `https://${host}/${cfg.policy.project}.git`;
    // The same credential as https://gitlab-ci-token:<job token>@host, sent as a Basic header through the environment
    // (GIT_CONFIG_*), so the token is in no process list and not in the clone's .git/config (F13).
    const basic = Buffer.from(`gitlab-ci-token:${process.env.CI_JOB_TOKEN ?? die('CI_JOB_TOKEN is not set')}`).toString('base64');
    Object.assign(env, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}` });
  }
  const r = spawnSync('git', [...args, url, dest], { encoding: 'utf8', env });
  if (r.status !== 0) die(`cannot clone ${cfg.policy.project}: ${(r.stderr ?? '').trim().split('\n')[0]}`);
  return dest;
}

/** The four write tokens of belay-apply. A child never inherits one: its call hands it the one it writes with (F71). */
export const TOKENS = ['BELAY_BOT_TOKEN', 'BELAY_POLICY_TOKEN', 'BELAY_LEDGER_TOKEN', 'BELAY_DISPATCH_TOKEN'];

/** `{name: value}` of the named tokens that are set, for a glue call that writes with them. */
export function tokens(...names) {
  return Object.fromEntries(names.filter((n) => TOKENS.includes(n) && process.env[n]).map((n) => [n, process.env[n]]));
}

/**
 * Runs a glue script for one target: `{code, stdout}`, its stderr passed through. The child gets this process's
 * environment without the four write tokens, plus `env`: a call that writes passes its own token (`tokens(...)`).
 */
export function glue(script, args, env = {}, cwd = process.cwd()) {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([k]) => !TOKENS.includes(k.toUpperCase())));
  const r = spawnSync(process.execPath, [path.join(GLUE, script), ...args], { cwd, encoding: 'utf8', env: { ...inherited, ...env }, maxBuffer: 64 << 20 });
  if (r.stderr) process.stderr.write(r.stderr);
  return { code: r.status ?? 2, stdout: r.stdout ?? '' };
}
