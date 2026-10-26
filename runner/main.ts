// `afterlife run` lands here (cli/belay.mjs runs this through tsx): parse flags, print what is about to be
// spent, stop there on --dry-run, otherwise run the waves and narrate each event. Exit 2 = bad usage.
import { RUN_DEFAULTS, loadFleet, runWaves, type RunOptions } from './index';
import { MODEL_TOKEN } from './agent/spawn';
import { killAll } from './proc/proc';
import { parseIdeaSources } from './ideas';
import { defaultFleetFile, refRefusal, runCaps } from './wave/runWaves';

// Lanes run detached (their own process group on POSIX): stopping the runner must stop them too, or claude
// keeps editing and spending with nobody to gate it. The worktrees under <repo>/.claude/worktrees stay behind
// until the next run on the repo removes them (git/worktree.ts claimOwnWorktrees); nothing was pushed.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    console.error(`afterlife run: ${sig}, stopping every lane`);
    void killAll().finally(() => process.exit(130));
  });
}

const USAGE = 'usage: afterlife run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file] [--mode execute|propose] [--base ref | --onto branch] [--ideas scan,lens-scan] [--skip-base-gates] [--dry-run]';

/** The flags USAGE names. Anything else is bad usage: a misspelt cap (`--lane-caps 1`) must not run at the default. */
const SWITCHES = new Set(['--dry-run', '--skip-base-gates']);
const VALUED = new Set(['--repo', '--waves', '--lanes', '--lane-cap', '--wave-cap', '--model', '--fleet', '--mode', '--base', '--onto', '--ideas']);

function flags(argv: string[]): Map<string, string> | null {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (SWITCHES.has(a)) out.set(a, '1');
    else if (!VALUED.has(a)) return null;
    else {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) return null;
      out.set(a, v);
    }
  }
  return out;
}

const positive = (v: string | undefined, dflt: number): number => {
  if (v === undefined) return dflt;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

/** A wave or lane count: a whole number, or `--lanes 2.5` would run three lanes and `--waves 1.5` two waves. */
const count = (v: string | undefined, dflt: number): number => {
  const n = positive(v, dflt);
  return Number.isInteger(n) ? n : NaN;
};

async function main(argv: string[]): Promise<number> {
  const f = flags(argv);
  const repo = f?.get('--repo');
  if (!f || !repo) {
    console.error(USAGE);
    return 2;
  }
  const mode = f.get('--mode') ?? 'execute';
  const ideas = f.has('--ideas') ? parseIdeaSources(f.get('--ideas') ?? '') : [];
  if ((mode !== 'execute' && mode !== 'propose') || !ideas || (f.has('--onto') && f.has('--base'))) {
    console.error(`${USAGE}\nafterlife run: --mode is execute or propose, --ideas a comma list of scan and lens-scan, and --onto is never given with --base`);
    return 2;
  }
  const opts: RunOptions = {
    repo,
    waves: count(f.get('--waves'), RUN_DEFAULTS.waves),
    lanes: count(f.get('--lanes'), RUN_DEFAULTS.lanes),
    laneCapUsd: positive(f.get('--lane-cap'), RUN_DEFAULTS.laneCapUsd),
    waveCapUsd: positive(f.get('--wave-cap'), RUN_DEFAULTS.waveCapUsd),
    model: f.get('--model') ?? RUN_DEFAULTS.model,
    fleet: f.get('--fleet') ?? defaultFleetFile(),
    ...(f.has('--skip-base-gates') ? { skipBaseGates: true } : {}),
    ...(mode === 'propose' ? { mode } : {}),
    ...(f.has('--base') ? { base: f.get('--base') } : {}),
    ...(f.has('--onto') ? { onto: f.get('--onto') } : {}),
    ...(ideas.length ? { ideas } : {}),
  };
  if ([opts.waves, opts.lanes, opts.laneCapUsd, opts.waveCapUsd].some(Number.isNaN)) {
    console.error(`${USAGE}\nafterlife run: --waves and --lanes must be whole numbers above 0, caps positive numbers`);
    return 2;
  }
  // claudeArgs refuses it too, but only at the plan call: after the base gates, minutes in.
  if (!MODEL_TOKEN.test(opts.model)) {
    console.error(`${USAGE}\nafterlife run: --model must be a plain model id (sonnet, claude-sonnet-5-5)`);
    return 2;
  }
  let fleetRepo;
  try {
    fleetRepo = loadFleet(opts.fleet as string).find((r) => r.slug === repo);
  } catch (e) {
    console.error(`afterlife run: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  if (!fleetRepo) {
    console.error(`afterlife run: repo "${repo}" is not in ${opts.fleet}`);
    return 2;
  }
  // A bad --base, or an --onto branch that is missing or checked out somewhere, stops here: nothing has run yet.
  const refused = await refRefusal(fleetRepo.path, opts);
  if (refused) {
    console.error(`afterlife run: ${refused}`);
    return 2;
  }
  const { laneCapUsd: laneCap, waveCapUsd: waveCap } = runCaps(opts, fleetRepo);
  const how = opts.mode === 'propose' ? 'propose (each wave runs only the read-only plan: no setup, gates, lanes or reflect)' : 'execute';
  const lands = opts.onto ? `onto   ${opts.onto} (an existing branch: every wave lands on it; it is never deleted)` : `base   ${opts.base ?? fleetRepo.base}${opts.base ? ` (--base; the fleet's is ${fleetRepo.base})` : ''}`;
  console.log(`repo   ${repo} (${fleetRepo.path})\nmode   ${how}\n${lands}\nideas  ${opts.ideas?.join(', ') ?? 'none'}\ncaps   lane $${laneCap}, wave $${waveCap}; ${opts.waves} wave(s) x ${opts.lanes} lane(s)\nmodel  ${opts.model}\ngates  ${fleetRepo.gates.length}${fleetRepo.frontier ? `\nfrontier  ${fleetRepo.frontier.metrics.length} metric(s): ${fleetRepo.frontier.metrics.map((m) => m.name).join(', ')}` : ''}`);
  if (f.has('--dry-run')) {
    console.log('dry run: nothing was spawned.');
    return 0;
  }
  return runWaves(opts, (e) => console.log(`[wave ${e.wave}] ${e.kind}${'lane' in e ? ` ${e.lane}` : ''}${e.kind === 'lane.end' ? ` -> ${e.outcome}` : ''}`));
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error(`afterlife run: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  },
);
