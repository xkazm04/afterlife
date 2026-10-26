// install-glab and glab-login: the two steps of /start a person would otherwise type. install-glab runs the platform's
// package manager (winget, brew) as one execFile; Linux has no one manager, so it is refused with the install docs.
// glab-login opens a NEW terminal window running `glab auth login` and returns as soon as the window opened: the login is
// interactive and finishes there, glab keeps the token in its own config, Afterlife never reads it, and the probe stream
// sees the login on the next check.
import { displayOf } from '../vitals/context';
import type { GlabLogin } from '@/server/start/wire';
import { outcome, SetupRefused, type SetupDeps, type SetupPlan } from './context';

export const GLAB_DOCS = 'https://gitlab.com/gitlab-org/cli#installation';
const INSTALL_MS = 10 * 60_000;

/** The package manager's command per platform; null where there is none to run. */
export function installCommand(platform: SetupDeps['platform']): { bin: string; argv: string[] } | null {
  if (platform === 'windows') return { bin: 'winget', argv: ['install', 'GLab.GLab', '--accept-source-agreements', '--accept-package-agreements'] };
  if (platform === 'macos') return { bin: 'brew', argv: ['install', 'glab'] };
  return null;
}

export async function planInstallGlab(deps: SetupDeps): Promise<SetupPlan> {
  const have = await deps.glab();
  if (have) throw new SetupRefused(`glab is already installed (${have.version}): nothing to install`);
  const cmd = installCommand(deps.platform);
  if (!cmd) throw new SetupRefused(`Afterlife installs glab only with winget (Windows) or Homebrew (macOS): on Linux, install it from ${GLAB_DOCS}`);
  if (!deps.onPath(cmd.bin)) {
    throw new SetupRefused(`${cmd.bin} is not on this machine's PATH: install glab by hand from ${GLAB_DOCS}`);
  }
  const display = displayOf(cmd.bin, cmd.argv);
  return {
    title: 'Install glab',
    summary: `Runs ${cmd.bin} on this machine to install the GitLab CLI, which Afterlife reads GitLab through.`,
    commands: [{ display, argv: [cmd.bin, ...cmd.argv], risk: 'low' }],
    diff: [],
    notes: [
      deps.platform === 'windows' ? 'winget may ask for permission in a Windows prompt: answer it there.' : 'brew may take a few minutes.',
      'Nothing else changes: the next check looks for glab again.',
    ],
    run: async () => {
      const r = await deps.exec(cmd.bin, cmd.argv, { timeoutMs: INSTALL_MS });
      const tail = (r.stderr || r.stdout).trim().split(/\r?\n/).at(-1) ?? '';
      return [outcome(display, r.code === 0, { exit: r.code, ...(r.code === 0 ? { made: 'glab installed' } : { error: tail || `exited ${r.code}` }) })];
    },
  };
}

/** The window per platform, and the command the person can copy where no window can be opened. */
function loginWindow(deps: SetupDeps, glab: string, login: string[]): { bin: string; argv: string[] } | null {
  if (deps.platform === 'windows') return { bin: 'cmd', argv: ['/c', 'start', 'glab login', 'cmd', '/k', glab, ...login] };
  if (deps.platform === 'macos') {
    const script = [glab, ...login].map((a) => (/^[A-Za-z0-9_./:-]+$/.test(a) ? a : `'${a.replace(/'/g, '')}'`)).join(' ');
    return { bin: 'osascript', argv: ['-e', `tell application "Terminal" to do script "${script}"`, '-e', 'tell application "Terminal" to activate'] };
  }
  return deps.onPath('x-terminal-emulator') ? { bin: 'x-terminal-emulator', argv: ['-e', glab, ...login] } : null;
}

export async function planGlabLogin(deps: SetupDeps, intent: GlabLogin): Promise<SetupPlan> {
  const have = await deps.glab();
  if (!have) throw new SetupRefused('glab is not installed yet: install it first (install-glab), then log in');
  // A path with a space or a quote would be parsed again by the window's shell: such a glab is named by its bare name.
  const glab = /^[A-Za-z0-9_./:\\-]+$/.test(have.bin) ? have.bin : 'glab';
  const login = ['auth', 'login', ...(intent.host ? ['--hostname', intent.host] : [])];
  const typed = displayOf('glab', login);
  const w = loginWindow(deps, glab, login);
  if (!w) throw new SetupRefused(`no terminal Afterlife can open here (no x-terminal-emulator): run \`${typed}\` in your own terminal`);
  const display = displayOf(w.bin, w.argv);
  return {
    title: `Log in to ${intent.host ?? 'gitlab.com'} with glab`,
    summary: `Opens a new terminal window running ${typed}; you finish the login there.`,
    commands: [{ display, argv: [w.bin, ...w.argv], risk: 'low' }],
    diff: [],
    notes: ['glab keeps the token in its own config: Afterlife never reads or stores it.', 'The next check sees the login once you finish it in the window.'],
    run: async () => {
      const r = await deps.launch(w.bin, w.argv);
      return [r.ok ? outcome(display, true, { made: 'a terminal window opened' }) : outcome(display, false, { error: r.error })];
    },
  };
}
