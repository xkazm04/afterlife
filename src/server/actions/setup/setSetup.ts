// set-setup: the runtime settings /start writes (<data dir>/settings.json, env/settings.ts), then the live runtime started
// again in this process (restartRuntime): no server restart. The env always wins, so a key the env sets to another value
// is refused with the reason, never written to be ignored. An optional field the intent leaves out keeps its setting.
import { envOf } from '@/server/env/env';
import { readSettings, settingsFile, SETTING_KEYS, writeSettings, type RuntimeSettings } from '@/server/env/settings';
import type { RestartOutcome } from '@/server/data/live/runtime';
import { messageOf } from '@/lib/format/error';
import type { SetSetup } from '@/server/start/wire';
import { outcome, SetupRefused, type SetupDeps, type SetupPlan } from './context';

/** What the runtime is after a restart, in one line. */
export function restartLine(r: RestartOutcome): string {
  if (r.mode === 'demo') return 'demo: the illustrative data, no live runtime';
  return r.ok ? `live: first poll finished, ${r.projects} project(s)` : `live, but the start failed: ${r.reason}`;
}

export function planSetSetup(deps: SetupDeps, intent: SetSetup): SetupPlan {
  const before = readSettings(deps.env);
  const patch: Partial<RuntimeSettings> = {};
  const diff: string[] = [];
  const kept: string[] = [];
  for (const [field, key] of SETTING_KEYS) {
    const want = intent[field];
    if (want === undefined) continue;
    const env = envOf(deps.env, key);
    if (env !== undefined) {
      if (env !== want) {
        throw new SetupRefused(`AFTERLIFE_${key} (or BELAY_${key}) is set in this server's environment to ${JSON.stringify(env)}, and the env wins over a setting: unset it and restart the server, then set ${field} here`);
      }
      kept.push(`${field} is already ${JSON.stringify(env)} in the environment: left to it`);
      continue;
    }
    if (before[field] === want) continue;
    patch[field] = want as never;
    diff.push(`- ${field}: ${before[field] ?? '(unset)'}`, `+ ${field}: ${want}`);
  }
  const file = settingsFile(deps.env).replace(/\\/g, '/');
  const writeDisplay = `write ${file}`;
  const restartDisplay = 'restart the live runtime in this server';
  return {
    title: 'Save the setup',
    summary: diff.length ? `Writes ${diff.length / 2} setting(s) and starts the runtime again on them, without restarting the server.` : 'The settings already say this: starts the runtime again on them.',
    commands: [{ display: writeDisplay, argv: ['write', file], risk: 'low' }, { display: restartDisplay, argv: ['restart-runtime'], risk: 'low' }],
    diff,
    notes: [
      ...kept,
      ...(intent.mode === 'live' ? ['Live mode reads GitLab as your own glab login; the first poll runs right after the write.'] : []),
      'A variable set in the environment always wins over these settings.',
    ],
    digestExtra: JSON.stringify([before, patch]),
    run: async () => {
      try {
        writeSettings(patch, deps.env);
      } catch (e) {
        return [outcome(writeDisplay, false, { error: messageOf(e) }), outcome(restartDisplay, false, { error: 'not run: the settings were not written' })];
      }
      const wrote = outcome(writeDisplay, true, { made: diff.length ? `${diff.length / 2} setting(s) written` : 'nothing changed' });
      try {
        const r = await deps.restart();
        const ok = r.mode === 'demo' || r.ok;
        return [wrote, outcome(restartDisplay, ok, ok ? { made: restartLine(r) } : { error: restartLine(r) })];
      } catch (e) {
        return [wrote, outcome(restartDisplay, false, { error: messageOf(e) })];
      }
    },
  };
}
