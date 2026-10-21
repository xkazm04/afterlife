// What each claude call may do, as a settings file plus three shell-safe flags. Headless -p mode denies every
// tool call that would prompt, so a lane can run a shell check only through an allow rule. Rules go in a JSON
// file (passed as `--settings <path>`) rather than argv because on Windows claude.cmd runs through cmd.exe
// with unescaped argv, and a rule like `Bash(cargo fmt:*)` holds spaces and parens. Deny always wins.
//   plan    - Read, Grep and Glob only: the tool list itself is cut to those three.
//   review  - the same three: a fresh session that reads a lane's change and edits nothing.
//   lane    - edits, plus Bash for the prefixes of the repo's gates, setup and laneTools; never git or network.
//             The lane's one repair turn runs under this profile too.
//   reflect - no tool at all.

export type PermissionProfile = { step: 'plan' } | { step: 'review' } | { step: 'reflect' } | { step: 'lane'; bash: string[] };

export interface PermissionArgs {
  mode: 'default' | 'acceptEdits';
  /** The value of --tools: a comma list, or '' for no tool at all. */
  tools: string;
  settings: { permissions: { defaultMode: string; allow: string[]; deny: string[] } };
}

const PLAN_TOOLS = ['Read', 'Grep', 'Glob'];
const LANE_TOOLS = ['Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'NotebookEdit'];
const NETWORK = ['WebFetch', 'WebSearch'];
const ALL_TOOLS = ['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit', 'Read', 'Grep', 'Glob', 'Agent', 'Task', 'Skill', ...NETWORK];
/** Programs a lane never runs: git state is the runner's, and the network is closed. */
const LANE_DENY_BASH = ['git', 'curl', 'wget', 'gh', 'glab'];

/** First words that run another program: the prefix then takes one more word (`uv run ruff`, `npm run lint`). */
const LAUNCHERS = new Set(['uv run', 'npm run', 'npm exec', 'pnpm exec', 'pnpm run', 'yarn run', 'poetry run', 'pipx run', 'bundle exec']);
/** Programs that run anything they are handed: never allowed on their own word. */
const BARE = new Set(['npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'uv', 'uvx', 'cargo', 'node', 'python', 'python3', 'py', 'sh', 'bash', 'cmd', 'powershell', 'pwsh', 'env', 'sudo', 'bun', 'bunx', 'deno', 'go', 'poetry', 'pipx', 'bundle']);
/** A plain argv word: no quote, no glob, no redirection, no variable. */
const WORD = /^[A-Za-z0-9@%+=:,./_-]+$/;

/** One command's allow prefix, or null when it has none safe to allow. */
function prefixOf(command: string): string | null {
  const words: string[] = [];
  for (const w of command.replace(/"[^"]*"|'[^']*'/g, ' ').trim().split(/\s+/)) {
    if (!w || w.startsWith('-') || !WORD.test(w)) break;
    words.push(w);
  }
  if (words.length === 0) return null;
  const want = LAUNCHERS.has(`${words[0]} ${words[1]}`) ? 3 : words.length === 1 ? 1 : 2;
  if (words.length < want) return null;
  const prefix = words.slice(0, want).join(' ');
  return want === 1 && BARE.has(prefix) ? null : prefix;
}

/** Bash allow prefixes for a lane: every sub-command (split on && ; || |) of the gates and setup, plus extras as given. */
export function bashPrefixes(commands: readonly string[], extra: readonly string[] = []): string[] {
  const out = new Set<string>();
  for (const c of commands) {
    for (const part of c.split(/&&|\|\||;|\|/)) {
      const p = prefixOf(part);
      if (p) out.add(p);
    }
  }
  for (const e of extra) out.add(e.trim().replace(/\s+/g, ' '));
  return [...out].filter((p) => p && !LANE_DENY_BASH.includes(p.split(' ')[0] ?? ''));
}

export function permissionArgs(p: PermissionProfile): PermissionArgs {
  if (p.step === 'plan' || p.step === 'review') {
    const deny = ALL_TOOLS.filter((t) => !PLAN_TOOLS.includes(t));
    return { mode: 'default', tools: PLAN_TOOLS.join(','), settings: { permissions: { defaultMode: 'default', allow: PLAN_TOOLS, deny } } };
  }
  if (p.step === 'reflect') {
    return { mode: 'default', tools: '', settings: { permissions: { defaultMode: 'default', allow: [], deny: ALL_TOOLS } } };
  }
  const deny = [...NETWORK, 'PowerShell', 'Agent', 'Task', ...LANE_DENY_BASH.map((b) => `Bash(${b}:*)`)];
  return { mode: 'acceptEdits', tools: LANE_TOOLS.join(','), settings: { permissions: { defaultMode: 'acceptEdits', allow: p.bash.map((b) => `Bash(${b}:*)`), deny } } };
}
