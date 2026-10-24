// `belay run` lands here (cli/belay.mjs runs this through tsx): parse flags, print what is about to be
// spent, stop there on --dry-run, otherwise run the waves and narrate each event. Exit 2 = bad usage.
import { RUN_DEFAULTS, loadFleet, runWaves, type RunOptions } from './index';
import { MODEL_TOKEN } from './agent/spawn';
import { killAll } from './proc/proc';
import { defaultFleetFile } from './wave/runWaves';

// Lanes run detached (their own process group on POSIX): stopping the runner must stop them too, or claude
// keeps editing and spending with nobody to gate it. The lane worktrees under <repo>/.claude/worktrees stay
// behind for a person to remove; nothing was pushed.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sig, () => {
    console.error(`belay run: ${sig}, stopping every lane`);
    void killAll().finally(() => process.exit(130));
  });
}

const USAGE = 'usage: belay run --repo <slug> [--waves n] [--lanes n] [--lane-cap usd] [--wave-cap usd] [--model m] [--fleet file] [--skip-base-gates] [--dry-run]';

/** The flags USAGE names. Anything else is bad usage: a misspelt cap (`--lane-caps 1`) must not run at the default. */
const SWITCHES = new Set(['--dry-run', '--skip-base-gates']);
const VALUED = new Set(['--repo', '--waves', '--lanes', '--lane-cap', '--wave-cap', '--model', '--fleet']);

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
  const opts: RunOptions = {
    repo,
    waves: count(f.get('--waves'), RUN_DEFAULTS.waves),
    lanes: count(f.get('--lanes'), RUN_DEFAULTS.lanes),
    laneCapUsd: positive(f.get('--lane-cap'), RUN_DEFAULTS.laneCapUsd),
    waveCapUsd: positive(f.get('--wave-cap'), RUN_DEFAULTS.waveCapUsd),
    model: f.get('--model') ?? RUN_DEFAULTS.model,
    fleet: f.get('--fleet') ?? defaultFleetFile(),
    ...(f.has('--skip-base-gates') ? { skipBaseGates: true } : {}),
  };
  if ([opts.waves, opts.lanes, opts.laneCapUsd, opts.waveCapUsd].some(Number.isNaN)) {
    console.error(`${USAGE}\nbelay run: --waves and --lanes must be whole numbers above 0, caps positive numbers`);
    return 2;
  }
  // claudeArgs refuses it too, but only at the plan call: after the base gates, minutes in.
  if (!MODEL_TOKEN.test(opts.model)) {
    console.error(`${USAGE}\nbelay run: --model must be a plain model id (sonnet, claude-sonnet-5-5)`);
    return 2;
  }
  let fleetRepo;
  try {
    fleetRepo = loadFleet(opts.fleet as string).find((r) => r.slug === repo);
  } catch (e) {
    console.error(`belay run: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  if (!fleetRepo) {
    console.error(`belay run: repo "${repo}" is not in ${opts.fleet}`);
    return 2;
  }
  const laneCap = Math.min(opts.laneCapUsd, fleetRepo.laneCapUsd ?? Infinity);
  const waveCap = Math.min(opts.waveCapUsd, fleetRepo.waveCapUsd ?? Infinity);
  console.log(`repo   ${repo} (${fleetRepo.path})\nbase   ${fleetRepo.base}\ncaps   lane $${laneCap}, wave $${waveCap}; ${opts.waves} wave(s) x ${opts.lanes} lane(s)\nmodel  ${opts.model}\ngates  ${fleetRepo.gates.length}${fleetRepo.frontier ? `\nfrontier  ${fleetRepo.frontier.metrics.length} metric(s): ${fleetRepo.frontier.metrics.map((m) => m.name).join(', ')}` : ''}`);
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
    console.error(`belay run: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  },
);
